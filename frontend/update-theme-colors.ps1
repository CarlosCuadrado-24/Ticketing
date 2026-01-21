# Script para actualizar toda la paleta de colores del frontend
# De azul a naranja y tema dark

Write-Host "Actualizando tema del frontend a Dark/Orange..." -ForegroundColor Cyan

# Definir reemplazos
$replacements = @(
    @{Old = '#1313ec'; New = '#FF4D00'},
    @{Old = 'primary-600'; New = 'primary'},
    @{Old = 'primary-700'; New = 'primary'},
    @{Old = 'bg-blue-600'; New = 'bg-primary'},
    @{Old = 'text-blue-600'; New = 'text-primary'},
    @{Old = 'hover:bg-blue-700'; New = 'hover:bg-primary'},
    @{Old = 'border-blue-600'; New = 'border-primary'},
    @{Old = 'bg-white '; New = 'bg-background-light '},
    @{Old = 'text-gray-900 '; New = 'text-white '},
    @{Old = 'text-[#111118]'; New = 'text-white'},
    @{Old = 'border-gray-200 '; New = 'border-white/10 '}
)

# Rutas a actualizar
$paths = @(
    "src\app\**\*.html",
    "src\app\**\*.ts"
)

$filesUpdated = 0
$totalReplacements = 0

foreach ($pattern in $paths) {
    $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        $modified = $false
        $fileReplacements = 0
        
        foreach ($replacement in $replacements) {
            if ($content -match [regex]::Escape($replacement.Old)) {
                $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
                $modified = $true
                $fileReplacements++
            }
        }
        
        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesUpdated++
            $totalReplacements += $fileReplacements
            Write-Host "OK: $($file.Name) - $fileReplacements cambios" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Archivos modificados: $filesUpdated" -ForegroundColor Yellow
Write-Host "Total de reemplazos: $totalReplacements" -ForegroundColor Yellow
