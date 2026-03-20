# ============================================================
# VYNE Core Service — Multi-stage Dockerfile
# Build: .NET 9 SDK → Runtime: Alpine ASP.NET
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Copy project files and restore (cached layer)
COPY ["Vyne.Core/Vyne.Core.csproj", "Vyne.Core/"]
RUN dotnet restore "Vyne.Core/Vyne.Core.csproj"

# Copy source and build
COPY Vyne.Core/ Vyne.Core/
WORKDIR /src/Vyne.Core
RUN dotnet build -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish --no-restore \
    /p:UseAppHost=false

# ── Runtime Image ─────────────────────────────────────────────

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Security: run as non-root
RUN addgroup -S vyne && adduser -S vyne -G vyne
USER vyne

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5001/health || exit 1

COPY --from=publish --chown=vyne:vyne /app/publish .

EXPOSE 5001
ENV ASPNETCORE_URLS=http://+:5001
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Vyne.Core.dll"]
