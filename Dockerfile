# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY ["DvtMustacheJudge.Api/DvtMustacheJudge.Api.csproj", "DvtMustacheJudge.Api/"]
RUN dotnet restore "DvtMustacheJudge.Api/DvtMustacheJudge.Api.csproj"

# Copy full source and publish
COPY DvtMustacheJudge.Api/ DvtMustacheJudge.Api/
WORKDIR "/src/DvtMustacheJudge.Api"
RUN dotnet publish "DvtMustacheJudge.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app
EXPOSE 10000
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "DvtMustacheJudge.Api.dll"]
