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
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Tests;

public class ProjectsControllerTests
{
    private readonly Mock<IProjectRepository> _projectRepoMock;
    private readonly Mock<IIssueRepository> _issueRepoMock;
    private readonly Mock<IHubContext<ProjectsHub>> _hubMock;
    private readonly Mock<ITenantContext> _tenantMock;
    private readonly Mock<ILogger<ProjectsController>> _loggerMock;
    private readonly ProjectsController _controller;
    private readonly Guid _orgId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    public ProjectsControllerTests()
    {
        _projectRepoMock = new Mock<IProjectRepository>();
        _issueRepoMock = new Mock<IIssueRepository>();
        _hubMock = new Mock<IHubContext<ProjectsHub>>();
        _tenantMock = new Mock<ITenantContext>();
        _loggerMock = new Mock<ILogger<ProjectsController>>();

        _tenantMock.Setup(t => t.OrgId).Returns(_orgId);
        _tenantMock.Setup(t => t.UserId).Returns(_userId);
        _tenantMock.Setup(t => t.IsAuthenticated).Returns(true);

        // Set up hub mock chain
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        _hubMock.Setup(h => h.Clients).Returns(mockClients.Object);

        _controller = new ProjectsController(
            _projectRepoMock.Object,
            _issueRepoMock.Object,
            _hubMock.Object,
            _tenantMock.Object,
            _loggerMock.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    // ── GET /projects ────────────────────────────────────────────────────────

    [Fact]
    public async Task List_ReturnsProjectsWithIssueCounts()
    {
        // Arrange
        var project = Project.Create(_orgId, "My Project", "MYP", leadId: _userId);

        _projectRepoMock.Setup(r => r.ListAsync(_orgId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Project> { project });

        _issueRepoMock.Setup(r => r.ListAsync(It.IsAny<IssueFilters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Issue>(new List<Issue>(), 0, 1, int.MaxValue));

        // Act
        var result = await _controller.List(CancellationToken.None);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = ok.Value as List<object>;
        projects.Should().NotBeNull();
        projects!.Count.Should().Be(1);
    }

    [Fact]
    public async Task List_ReturnsEmptyListWhenNoProjects()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.ListAsync(_orgId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Project>());

        // Act
        var result = await _controller.List(CancellationToken.None);

        // Assert
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = ok.Value as List<object>;
        projects.Should().NotBeNull();
        projects!.Count.Should().Be(0);
    }

    [Fact]
    public async Task List_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);

        // Act
        var result = await _controller.List(CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── POST /projects ───────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ReturnsCreatedResult()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.IdentifierExistsAsync(_orgId, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _projectRepoMock.Setup(r => r.CreateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project p, CancellationToken _) => p);

        var body = new CreateProjectRequest(
            Name: "New Project",
            Description: "A new test project",
            Icon: null,
            Color: "#3B82F6",
            Identifier: "NWP");

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
        _projectRepoMock.Verify(r => r.CreateAsync(
            It.Is<Project>(p => p.Name == "New Project" && p.Identifier == "NWP"),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Create_GeneratesIdentifierFromName()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.IdentifierExistsAsync(_orgId, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _projectRepoMock.Setup(r => r.CreateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project p, CancellationToken _) => p);

        var body = new CreateProjectRequest(
            Name: "Engineering",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: null); // No identifier provided — should auto-generate

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
        _projectRepoMock.Verify(r => r.CreateAsync(
            It.Is<Project>(p => p.Identifier.Length > 0),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Create_RejectsEmptyName()
    {
        // Arrange
        var body = new CreateProjectRequest(
            Name: "",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: null);

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_RejectsDuplicateIdentifier()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.IdentifierExistsAsync(_orgId, "DUP", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var body = new CreateProjectRequest(
            Name: "Duplicate Project",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: "DUP");

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Create_RejectsIdentifierTooLong()
    {
        // Arrange
        var body = new CreateProjectRequest(
            Name: "Long Identifier Project",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: "THIS_IS_A_VERY_LONG_IDENTIFIER_THAT_EXCEEDS_20_CHARS");

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_ReturnsUnauthorizedWhenNoTenant()
    {
        // Arrange
        _tenantMock.Setup(t => t.OrgId).Returns((Guid?)null);

        var body = new CreateProjectRequest(
            Name: "Test",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: null);

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── GET /projects/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsProjectWhenExists()
    {
        // Arrange
        var project = Project.Create(_orgId, "Test", "TST");
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        // Act
        var result = await _controller.GetById(project.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_ReturnsNotFoundForMissingProject()
    {
        // Arrange
        _projectRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project?)null);

        // Act
        var result = await _controller.GetById(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetById_ReturnsNotFoundForOtherOrgProject()
    {
        // Arrange — project belongs to different org
        var otherOrgProject = Project.Create(Guid.NewGuid(), "Other Org Project", "OTH");
        _projectRepoMock.Setup(r => r.GetByIdAsync(otherOrgProject.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(otherOrgProject);

        // Act
        var result = await _controller.GetById(otherOrgProject.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── PATCH /projects/{id} ────────────────────────────────────────────────

    [Fact]
    public async Task Update_UpdatesProjectFields()
    {
        // Arrange
        var project = Project.Create(_orgId, "Original Name", "ORG");
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);
        _projectRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project p, CancellationToken _) => p);

        var body = new UpdateProjectRequest(
            Name: "Updated Name",
            Description: "New description",
            Icon: null,
            Color: "#FF0000",
            LeadId: null,
            Settings: null);

        // Act
        var result = await _controller.Update(project.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        project.Name.Should().Be("Updated Name");
    }

    [Fact]
    public async Task Update_RejectsUpdateToArchivedProject()
    {
        // Arrange
        var project = Project.Create(_orgId, "Archived Project", "ARC");
        project.Archive();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        var body = new UpdateProjectRequest(
            Name: "Try Update",
            Description: null,
            Icon: null,
            Color: null,
            LeadId: null,
            Settings: null);

        // Act
        var result = await _controller.Update(project.Id, body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<UnprocessableEntityObjectResult>();
    }

    // ── DELETE /projects/{id} (Archive) ─────────────────────────────────────

    [Fact]
    public async Task Archive_ArchivesProject()
    {
        // Arrange
        var project = Project.Create(_orgId, "To Archive", "DEL");
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);
        _projectRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project p, CancellationToken _) => p);

        // Act
        var result = await _controller.Archive(project.Id, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        project.Status.Should().Be(ProjectStatus.Archived);
    }

    [Fact]
    public async Task Archive_IsIdempotentForAlreadyArchived()
    {
        // Arrange
        var project = Project.Create(_orgId, "Already Archived", "ALR");
        project.Archive();
        _projectRepoMock.Setup(r => r.GetByIdAsync(project.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        // Act
        var result = await _controller.Archive(project.Id, CancellationToken.None);

        // Assert — should still return Ok without calling UpdateAsync
        result.Should().BeOfType<OkObjectResult>();
        _projectRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ── Project Key Uniqueness ──────────────────────────────────────────────

    [Fact]
    public async Task Create_EnforcesIdentifierUniquenessAcrossOrg()
    {
        // Arrange — first project with identifier "ENG" exists
        _projectRepoMock.Setup(r => r.IdentifierExistsAsync(_orgId, "ENG", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var body = new CreateProjectRequest(
            Name: "Engineering 2",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: "eng"); // lowercase — should be normalized to "ENG"

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Create_AllowsSameIdentifierInDifferentOrgs()
    {
        // Arrange — no existing project with "TEAM" in current org
        _projectRepoMock.Setup(r => r.IdentifierExistsAsync(_orgId, "TEAM", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _projectRepoMock.Setup(r => r.CreateAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Project p, CancellationToken _) => p);

        var body = new CreateProjectRequest(
            Name: "Team Project",
            Description: null,
            Icon: null,
            Color: null,
            Identifier: "TEAM");

        // Act
        var result = await _controller.Create(body, CancellationToken.None);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();
    }
}
