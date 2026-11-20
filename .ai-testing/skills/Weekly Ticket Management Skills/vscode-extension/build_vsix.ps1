# Đóng gói extension thành fastdo-weekly-pipeline.vsix (không cần vsce/npm) rồi cài vào VS Code
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$dir = $PSScriptRoot
$pkg = Get-Content (Join-Path $dir 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$out = Join-Path $dir "$($pkg.name).vsix"
if (Test-Path $out) { Remove-Item $out -Force }

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="$($pkg.name)" Version="$($pkg.version)" Publisher="$($pkg.publisher)" />
    <DisplayName>Fastdo Pipeline ticket tuan</DisplayName>
    <Description xml:space="preserve">Visual Pipeline ticket tuan trong VS Code</Description>
    <Categories>Other</Categories>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$($pkg.engines.vscode)" />
    </Properties>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code" /></Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
  </Assets>
</PackageManifest>
"@
$types = @"
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json" />
  <Default Extension=".js" ContentType="application/javascript" />
  <Default Extension=".md" ContentType="text/markdown" />
  <Default Extension=".vsixmanifest" ContentType="text/xml" />
</Types>
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
function Add-Text($name, $text) {
  $e = $zip.CreateEntry($name); $w = New-Object System.IO.StreamWriter($e.Open(), $utf8); $w.Write($text); $w.Close()
}
Add-Text 'extension.vsixmanifest' $manifest
Add-Text '[Content_Types].xml' $types
foreach ($f in 'package.json', 'extension.js', 'README.md') {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $dir $f), "extension/$f") | Out-Null
}
$zip.Dispose()
Write-Output "Da tao $out"
& code --install-extension $out --force
