Add-Type -AssemblyName System.Drawing

$src = "C:\Users\LUCKY\.gemini\antigravity\brain\c0b9201d-d038-4e6c-a45e-887122382248\.user_uploaded\media_1788279357707.jpg"

$targets = @(
    "C:\Users\LUCKY\OneDrive\Desktop\ARISE\assets\icon.png",
    "C:\Users\LUCKY\OneDrive\Desktop\ARISE\assets\android-icon-foreground.png",
    "C:\Users\LUCKY\OneDrive\Desktop\ARISE\assets\splash-icon.png",
    "C:\Users\LUCKY\OneDrive\Desktop\ARISE\assets\adaptive-icon.png"
)

$image = [System.Drawing.Image]::FromFile($src)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Remove-Item $target -Force
    }
    $image.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved true PNG to $target"
}

$image.Dispose()
Write-Host "All assets successfully converted to true PNG!"
