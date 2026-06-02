# WorkBridge Project

WorkBridge connects students with flexible part-time jobs, then continues into hiring, chat, interview scheduling, employment, shift management, shift pass requests, attendance, and payroll.

## Tech Stack

- Backend: .NET 8 Web API, Entity Framework Core, SQL Server
- Frontend: React + Vite
- Database: SQL Server with EF Core migrations

## Prerequisites

- Git / Git Bash
- SQL Server running locally or an accessible SQL Server instance
- .NET SDK 8 or newer
- Node.js 20 or newer
- EF Core CLI:

```powershell
dotnet tool install --global dotnet-ef --version 8.0.8
```

If `dotnet ef` is not found in the current terminal:

```powershell
$env:PATH = "$env:USERPROFILE\.dotnet\tools;$env:PATH"
```

## Database Setup

The project now supports database-first portability through EF Core migrations. A new machine should create/update the database with migrations instead of depending on a copied local database.

Default local connection string:

```text
Server=.;Database=WorkBridgeDB;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True
```

Create or update the database:

```powershell
cd Backend
dotnet ef database update --project WorkBridge.Infrastructure\WorkBridge.Infrastructure.csproj --startup-project WorkBridge.API\WorkBridge.API.csproj --context WorkBridgeContext
```

Use a different SQL Server or database:

```powershell
cd Backend
dotnet ef database update --project WorkBridge.Infrastructure\WorkBridge.Infrastructure.csproj --startup-project WorkBridge.API\WorkBridge.API.csproj --context WorkBridgeContext --connection "Server=.;Database=WorkBridgeDB;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"
```

The initial migration seeds required base data:

- Roles: `Admin`, `Employer`, `Applicant`
- Job categories
- Job shifts

`Backend/WorkBridge_DB.sql` is kept as a compatibility/manual SQL script, but migrations are the recommended setup path.

## Run Backend

```powershell
cd Backend
dotnet run --project WorkBridge.API\WorkBridge.API.csproj
```

Backend default URL:

```text
http://localhost:5029
```

Override the connection string for a terminal session:

```powershell
$env:ConnectionStrings__DefaultConnection = "Server=.;Database=WorkBridgeDB;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"
dotnet run --project WorkBridge.API\WorkBridge.API.csproj
```

## Email Setup

Email credentials must stay outside git. The repository includes a safe template:

```powershell
Copy-Item WorkBridge.API\appsettings.Development.example.json WorkBridge.API\appsettings.Development.json
```

Then edit `WorkBridge.API\appsettings.Development.json` and fill your own Gmail address and Google App Password. This file is ignored by git through `.gitignore`, so real passwords will not be pushed.

Recommended local setup with .NET user secrets:

```powershell
cd Backend\WorkBridge.API
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Host" "smtp.gmail.com"
dotnet user-secrets set "Email:Port" "587"
dotnet user-secrets set "Email:UseSsl" "true"
dotnet user-secrets set "Email:UserName" "your-gmail-address@gmail.com"
dotnet user-secrets set "Email:Password" "your-google-app-password"
dotnet user-secrets set "Email:FromEmail" "your-gmail-address@gmail.com"
dotnet user-secrets set "Email:FromName" "WorkBridge"
dotnet user-secrets set "Email:WebAppUrl" "http://127.0.0.1:5173"
```

## Run Frontend

```powershell
cd Frontend
npm install
npm run dev
```

Frontend default URL:

```text
http://127.0.0.1:5173
```

## Verification

Backend build:

```powershell
cd Backend
dotnet build WorkBridge.API\WorkBridge.API.csproj
```

Frontend build:

```powershell
cd Frontend
npm run build
```

Migration smoke test with a temporary database:

```powershell
cd Backend
dotnet ef database update --project WorkBridge.Infrastructure\WorkBridge.Infrastructure.csproj --startup-project WorkBridge.API\WorkBridge.API.csproj --context WorkBridgeContext --connection "Server=.;Database=WorkBridgeDB_MigrationSmoke;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"
```
