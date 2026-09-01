$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repoRoot

try {
    $tracked = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to read tracked files.'
    }

    $forbiddenPaths = @(
        '(^|/)(data|private-data|exports|backups|uploads|reports|evidence)(/|$)',
        '(^|/)\.env($|\.)',
        '(^|/)[^/]*(secret|token|recovery-key)[^/]*$'
    )
    $forbiddenExtensions = '\.(csv|tsv|xls|xlsx|db|sqlite|sqlite3|pdf|zip|7z|bak|log)$'

    $violations = foreach ($file in $tracked) {
        $normalized = $file -replace '\\', '/'
        $blocked = $normalized -match $forbiddenExtensions
        foreach ($pattern in $forbiddenPaths) {
            if ($normalized -match $pattern) {
                $blocked = $true
            }
        }
        if ($blocked) {
            $file
        }
    }

    if ($violations) {
        Write-Error ("Public-scope check failed. Remove these tracked files from the public repository:`n" + ($violations -join "`n"))
    }

    Write-Output "PASS: $($tracked.Count) tracked files comply with the path and extension guard."
    Write-Output 'Reminder: inspect staged text and images manually; this check cannot identify every real name.'
}
finally {
    Pop-Location
}
