using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Vyne.Projects.Controllers;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Domain.Projects;
using Vyne.Projects.Hubs;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Events;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Tests;

public class IssuesControllerTests
{
    private readonly Mock<IIssueRepository> _issueRepoMock;
    private readonly Mock<IProjectRepository> _projectRepoMock;
    private readonly Mock<IEventPublisher> _eventsMock;
    private readonly Mock<IHubContext<ProjectsHub>> _hubMock;
    private readonly Mock<ITenantContext> _tenantMock;
    private readonly Mock<ILogger<IssuesController>> _loggerMock;
    private readonly IssuesController _controller;
    private readonly Guid _orgId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    public IssuesControllerTests()
    {
        _issueRepoMock = new Mock<IIssueRepository>();
        _projectRepoMock = new Mock<IProjectRepository>();
        _eventsMock = new Mock<IEventPublisher>();
        _hubMock = new Mock<IHubContext<ProjectsHub>>();
        _tenantMock = new Mock<ITenantContext>();
        _loggerMock = new Mock<ILogger<IssuesController>>();

        _tenantMock.Setup(t => t.OrgId).Returns(_orgId);
        _tenantMock.Setup(t => t.UserId).Returns(_userId);
        _tenantMock.Setup(t => t.IsAuthenticated).Returns(true);

        // Set up hub mock chain
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        _hubMock.Setup(h => h.Clients).Returns(mockClients.Object);

        _controller = new IssuesController(
            _issueRepoMock.Object,
            _projectRepoMock.Object,
            _eventsMock.Object,
            _hubMock.Object,
            _tenantMock.Object,
            _loggerMock.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Project CreateProject(Guid? id = null)
    {
        return Project.Create(_orgId, "Test Project", "TST", leadId: _userId);
    }

    private Issue CreateIssue(Guid projectId, string identifier = "TST-1",
        IssueStatus status = IssueStatus.Backlog, IssuePriority priority = IssuePriority.Medium)
    {
        return Issue.Create(_orgId, projectId, identifier, "Test Issue", _userId,
            status: status, priority: priority);
    }

    // ── GET /projects/{projectId}/issues ─────────────────────────────────────

    [Fact]
    public async Task List_ReturnsIssuesForProject()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        var issues = new List<Issue>
        {
            CreateIssue(project.Id, "TST-1"),
            CreateIssue(project.Id, "TST-2"),
        };

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(issues, 2, 1, 50));

        var query = new IssueListQuery();

        // Act
        var result = await _controller.List(project.Id, query, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task List_ReturnsNotFoundForMissingProject()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project?)null);

        var query = new IssueListQuery();

        // Act
        var result = await _controller.List(Guid.NewGuid(), query, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task List_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);
        var query = new IssueListQuery();

        // Act
        var result = await _controller.List(Guid.NewGuid(), query, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task List_PassesFiltersToRepository()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(new List<Issue>(), 0, 1, 50));

        var query = new IssueListQuery
        {
            Status = "InProgress",
            Priority = "High",
            AssigneeId = _userId,
        };

        // Act
        await _controller.List(project.Id, query, CancellationToken.None);

        // Assert
        _issueRepoMock.Verify(r => r.ListAsync(
            It.Is<IssueFilters>(f =>
                f.Status == "InProgress" &&
                f.Priority == "High" &&
                f.AssigneeId == _userId &&
                f.ProjectId == project.Id),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── POST /projects/{projectId}/issues ────────────────────────────────────

    [Fact]
    public async Task Create_ReturnsCreatedResult()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.NextIdentifierAsync(project.Id, project.Identifier, It.IsAny<CancellationToken>()))
            .ReturnsAsync("TST-1");

        _issueRepoMock.Setup(r => r.NextPositionAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1m);

        _issueRepoMock.Setup(r => r.CreateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Issue i, CancellationToken _) => i);

        var body = new CreateIssueRequest(
            Title: "New Issue",
            Description: "A test issue",
            Status: "Todo",
            Priority: "High",
            AssigneeId: _userId,
            SprintId: null,
            ParentIssueId: null,
            DueDate: null,
            Estimate: 5);

        // Act
        var result = await _controller.Create(project.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
        _issueRepoMock.Verify(r => r.CreateAsync(
            It.Is<Issue>(i =>
                i.Title == "New Issue" &&
                i.Status == IssueStatus.Todo &&
                i.Priority == IssuePriority.High),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Create_RejectsMissingTitle()
    {
        // Arrange
        var body = new CreateIssueRequest(
            Title: "",
            Description: null,
            Status: null,
            Priority: null,
            AssigneeId: null,
            SprintId: null,
            ParentIssueId: null,
            DueDate: null,
            Estimate: null);

        // Act
        var result = await _controller.Create(Guid.NewGuid(), body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_ReturnsNotFoundForMissingProject()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project?)null);

        var body = new CreateIssueRequest(
            Title: "Test Issue",
            Description: null,
            Status: null,
            Priority: null,
            AssigneeId: null,
            SprintId: null,
            ParentIssueId: null,
            DueDate: null,
            Estimate: null);

        // Act
        var result = await _controller.Create(Guid.NewGuid(), body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Create_PublishesActivityRecord()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.NextIdentifierAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("TST-1");
        _issueRepoMock.Setup(r => r.NextPositionAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1m);
        _issueRepoMock.Setup(r => r.CreateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Issue i, CancellationToken _) => i);

        var body = new CreateIssueRequest(
            Title: "Activity Test", Description: null, Status: null, Priority: null,
            AssigneeId: null, SprintId: null, ParentIssueId: null, DueDate: null, Estimate: null);

        // Act
        await _controller.Create(project.Id, body, CancellationToken.None);

        // Assert
        _issueRepoMock.Verify(r => r.AddActivityAsync(
            It.Is<IssueActivity>(a => a.Type == ActivityType.Created),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── Issue Status Transitions ─────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_TransitionsBacklogToInProgress()
    {
        // Arrange
        var project = CreateProject();
        var issue = CreateIssue(project.Id, "TST-10", IssueStatus.Backlog);

        _issueRepoMock.Setup(r => r.GetByIdAsync(issue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(issue);

        _issueRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Issue i, CancellationToken _) => i);

        var body = new UpdateIssueStatusRequest("InProgress");

        // Act
        var result = await _controller.UpdateStatus(issue.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        issue.Status.Should().Be(IssueStatus.InProgress);
    }

    [Fact]
    public async Task UpdateStatus_TransitionsInProgressToDone()
    {
        // Arrange
        var project = CreateProject();
        var issue = CreateIssue(project.Id, "TST-11", IssueStatus.InProgress);

        _issueRepoMock.Setup(r => r.GetByIdAsync(issue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(issue);

        _issueRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Issue i, CancellationToken _) => i);

        var body = new UpdateIssueStatusRequest("Done");

        // Act
        var result = await _controller.UpdateStatus(issue.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        issue.Status.Should().Be(IssueStatus.Done);
    }

    [Fact]
    public async Task UpdateStatus_RejectsInvalidStatus()
    {
        // Arrange
        var project = CreateProject();
        var issue = CreateIssue(project.Id, "TST-12");

        _issueRepoMock.Setup(r => r.GetByIdAsync(issue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(issue);

        var body = new UpdateIssueStatusRequest("InvalidStatus");

        // Act
        var result = await _controller.UpdateStatus(issue.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateStatus_RejectsEmptyStatus()
    {
        // Arrange
        var body = new UpdateIssueStatusRequest("");

        // Act
        var result = await _controller.UpdateStatus(Guid.NewGuid(), body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateStatus_ReturnsSameIssueWhenStatusUnchanged()
    {
        // Arrange
        var project = CreateProject();
        var issue = CreateIssue(project.Id, "TST-13", IssueStatus.Todo);

        _issueRepoMock.Setup(r => r.GetByIdAsync(issue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(issue);

        var body = new UpdateIssueStatusRequest("Todo");

        // Act
        var result = await _controller.UpdateStatus(issue.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        // UpdateAsync should NOT be called when status is the same
        _issueRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_PublishesStatusChangedEvent()
    {
        // Arrange
        var project = CreateProject();
        var issue = CreateIssue(project.Id, "TST-14", IssueStatus.Backlog);

        _issueRepoMock.Setup(r => r.GetByIdAsync(issue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(issue);
        _issueRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Issue>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Issue i, CancellationToken _) => i);

        var body = new UpdateIssueStatusRequest("InProgress");

        // Act
        await _controller.UpdateStatus(issue.Id, body, CancellationToken.None);

        // Assert
        _eventsMock.Verify(e => e.PublishAsync(
            "issue_status_changed",
            It.IsAny<object>(),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── Issue Reordering ─────────────────────────────────────────────────────

    [Fact]
    public async Task Reorder_UpdatesPositions()
    {
        // Arrange
        var updates = new List<ReorderItem>
        {
            new(Guid.NewGuid(), 1.0m),
            new(Guid.NewGuid(), 2.0m),
            new(Guid.NewGuid(), 3.0m),
        };

        var body = new ReorderIssuesRequest(updates);

        // Act
        var result = await _controller.Reorder(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NoContentResult>();
        _issueRepoMock.Verify(r => r.ReorderAsync(
            It.Is<List<(Guid Id, decimal Position)>>(l => l.Count == 3),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Reorder_RejectsEmptyUpdates()
    {
        // Arrange
        var body = new ReorderIssuesRequest(new List<ReorderItem>());

        // Act
        var result = await _controller.Reorder(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Reorder_RejectsNullUpdates()
    {
        // Arrange
        var body = new ReorderIssuesRequest(null!);

        // Act
        var result = await _controller.Reorder(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── Filtering by Status/Priority/Assignee ────────────────────────────────

    [Fact]
    public async Task List_FiltersByStatusString()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(new List<Issue>(), 0, 1, 50));

        var query = new IssueListQuery { Status = "Done" };

        // Act
        await _controller.List(project.Id, query, CancellationToken.None);

        // Assert
        _issueRepoMock.Verify(r => r.ListAsync(
            It.Is<IssueFilters>(f => f.Status == "Done"),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task List_FiltersByPriorityString()
    {
        // Arrange
        var project = CreateProject();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(new List<Issue>(), 0, 1, 50));

        var query = new IssueListQuery { Priority = "Urgent" };

        // Act
        await _controller.List(project.Id, query, CancellationToken.None);

        // Assert
        _issueRepoMock.Verify(r => r.ListAsync(
            It.Is<IssueFilters>(f => f.Priority == "Urgent"),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task List_FiltersByAssignee()
    {
        // Arrange
        var project = CreateProject();
        var assigneeId = Guid.NewGuid();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(new List<Issue>(), 0, 1, 50));

        var query = new IssueListQuery { AssigneeId = assigneeId };

        // Act
        await _controller.List(project.Id, query, CancellationToken.None);

        // Assert
        _issueRepoMock.Verify(r => r.ListAsync(
            It.Is<IssueFilters>(f => f.AssigneeId == assigneeId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
