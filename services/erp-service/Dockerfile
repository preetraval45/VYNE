# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files first to leverage Docker layer caching
COPY Vyne.ERP.sln ./
COPY Vyne.ERP/Vyne.ERP.csproj ./Vyne.ERP/

# Restore dependencies
RUN dotnet restore Vyne.ERP/Vyne.ERP.csproj

# Copy the rest of the source
COPY Vyne.ERP/ ./Vyne.ERP/

# Publish release build
RUN dotnet publish Vyne.ERP/Vyne.ERP.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Install timezone data and ICU for globalization
RUN apk add --no-cache icu-libs tzdata

# Configure globalization for alpine
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8

# Copy published output from builder
COPY --from=build /app/publish .

# Run as non-root user for security
RUN addgroup -S vyne && adduser -S vyne -G vyne
USER vyne

EXPOSE 5005

ENV ASPNETCORE_URLS=http://0.0.0.0:5005
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Vyne.ERP.dll"]
