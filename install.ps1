# PowerShell install script for alacritty-theme-switch
# Requires PowerShell 5.1 or later

#Requires -Version 5.1

$ErrorActionPreference = 'Stop'

# Constants
$RepoOwner = "tichopad"
$RepoName = "alacritty-theme-switch"
$BinaryName = "ats.exe"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\ats"

function Get-SystemArchitecture {
    <#
    .SYNOPSIS
    Detects the system architecture.

    .DESCRIPTION
    Returns "x86_64" for 64-bit systems.
    Exits with error for 32-bit or unsupported architectures.
    #>

    $arch = $env:PROCESSOR_ARCHITECTURE

    if ($arch -eq "AMD64" -or $arch -eq "x86_64") {
        return "x86_64"
    }
    elseif ($arch -eq "ARM64") {
        Write-Error "Error: ARM64 Windows is not currently supported"
        exit 1
    }
    else {
        Write-Error "Error: 32-bit Windows is not supported. Please use 64-bit Windows."
        exit 1
    }
}

function Get-BinaryFilename {
    <#
    .SYNOPSIS
    Maps architecture to binary filename.

    .PARAMETER Architecture
    The system architecture (e.g., "x86_64")
    #>
    param(
        [string]$Architecture
    )

    switch ($Architecture) {
        "x86_64" {
            return "ats-windows-x86_64.exe"
        }
        default {
            Write-Error "Error: No binary available for architecture: $Architecture"
            exit 1
        }
    }
}

function Get-LatestReleaseTag {
    <#
    .SYNOPSIS
    Fetches the latest release tag from GitHub.

    .DESCRIPTION
    Queries GitHub API for the latest non-prerelease release.
    Returns the tag name (e.g., "v1.2.3").
    #>

    $apiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

    try {
        Write-Host "Fetching latest release from GitHub..."
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop

        if (-not $response.tag_name) {
            Write-Error "Error: Could not parse release tag from GitHub API response"
            exit 1
        }

        return $response.tag_name
    }
    catch {
        Write-Error "Error: Failed to fetch release information from GitHub"
        Write-Error "URL: $apiUrl"
        Write-Error $_.Exception.Message
        exit 1
    }
}

function Download-Binary {
    <#
    .SYNOPSIS
    Downloads the binary from GitHub releases.

    .PARAMETER Tag
    The release tag (e.g., "v1.2.3")

    .PARAMETER BinaryFilename
    The binary filename to download
    #>
    param(
        [string]$Tag,
        [string]$BinaryFilename
    )

    $downloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/$Tag/$BinaryFilename"
    $tempFile = Join-Path $env:TEMP $BinaryFilename

    try {
        Write-Host "Downloading $BinaryFilename..."
        Write-Host "From: $downloadUrl"

        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -ErrorAction Stop

        # Verify file was downloaded and is not empty
        if (-not (Test-Path $tempFile) -or (Get-Item $tempFile).Length -eq 0) {
            Write-Error "Error: Downloaded file is empty or missing"
            if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
            exit 1
        }

        return $tempFile
    }
    catch {
        Write-Error "Error: Failed to download binary"
        Write-Error "URL: $downloadUrl"
        Write-Error $_.Exception.Message
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        exit 1
    }
}

function Install-Binary {
    <#
    .SYNOPSIS
    Installs the binary to the installation directory.

    .PARAMETER TempFile
    Path to the downloaded binary file
    #>
    param(
        [string]$TempFile
    )

    $installPath = Join-Path $InstallDir $BinaryName

    try {
        Write-Host "Installing to $installPath..."

        # Create installation directory if it doesn't exist
        if (-not (Test-Path $InstallDir)) {
            New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        }

        # Move binary to installation directory (overwrites if exists)
        Move-Item -Path $TempFile -Destination $installPath -Force

        Write-Host "Installation complete!"
        Write-Host "Binary installed to: $installPath"

        return $installPath
    }
    catch {
        Write-Error "Error: Failed to install binary"
        Write-Error $_.Exception.Message
        exit 1
    }
}

function Update-UserPath {
    <#
    .SYNOPSIS
    Adds installation directory to user PATH if not already present.

    .DESCRIPTION
    Checks if installation directory is in user's PATH.
    If not, adds it and notifies user.
    #>

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($currentPath -split ';' | Where-Object { $_ -eq $InstallDir }) {
        Write-Host "✓ $InstallDir is already in your PATH"
        Write-Host "You can now run: $($BinaryName -replace '\.exe$', '')"
        return
    }

    try {
        Write-Host "Adding $InstallDir to your PATH..."

        $newPath = if ($currentPath) {
            "$currentPath;$InstallDir"
        } else {
            $InstallDir
        }

        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

        Write-Host "✓ PATH updated successfully"
        Write-Host ""
        Write-Host "IMPORTANT: You need to restart your terminal for PATH changes to take effect."
        Write-Host "After restarting, you can run: $($BinaryName -replace '\.exe$', '')"
    }
    catch {
        Write-Warning "Warning: Failed to update PATH automatically"
        Write-Host ""
        Write-Host "Please add the following directory to your PATH manually:"
        Write-Host "  $InstallDir"
        Write-Host ""
        Write-Host "You can do this by:"
        Write-Host "  1. Open System Properties > Environment Variables"
        Write-Host "  2. Edit the 'Path' variable under 'User variables'"
        Write-Host "  3. Add: $InstallDir"
    }
}

function Main {
    <#
    .SYNOPSIS
    Main installation flow.
    #>

    Write-Host "Installing $($BinaryName -replace '\.exe$', '')..."
    Write-Host ""

    # Detect architecture
    $arch = Get-SystemArchitecture
    Write-Host "Detected architecture: $arch"

    # Get binary filename
    $binaryFilename = Get-BinaryFilename -Architecture $arch
    Write-Host "Binary: $binaryFilename"
    Write-Host ""

    # Get latest release
    $tag = Get-LatestReleaseTag
    Write-Host "Latest release: $tag"
    Write-Host ""

    # Download binary
    $tempFile = Download-Binary -Tag $tag -BinaryFilename $binaryFilename
    Write-Host ""

    # Install binary
    $installPath = Install-Binary -TempFile $tempFile
    Write-Host ""

    # Update PATH
    Update-UserPath
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Installation failed: $($_.Exception.Message)"
    exit 1
}

