<#
  Sobe os PDFs de laudos da pasta local para o bucket privado `fornecedores`
  do Supabase, usando chaves ASCII (o Storage rejeita chaves com acento/cedilha),
  iguais ao arquivo_path gravado em qualidade.documentos_fornecedor.

  Pré-requisitos:
    1. Migration 20260717120000 aplicada e documentos importados (metadados).
    2. A SERVICE_ROLE key do projeto (NÃO a anon):
       Supabase > Project Settings > API > service_role (secret).

  Uso (PowerShell):
    $env:SUPABASE_SERVICE_KEY = "eyJ...service_role..."
    ./scripts/upload-laudos-fornecedores.ps1
#>
param(
  [string]$BasePath   = "C:\Users\pedro.maraia\Documents\GERAIS\CLIENTES ATIVOS ENTREGANDO E A ENTREGAR MP",
  [string]$ProjectRef = "xglbppuiwdfuxdmyvbix",
  [string]$Bucket     = "fornecedores"
)

$key = $env:SUPABASE_SERVICE_KEY
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error "Defina `$env:SUPABASE_SERVICE_KEY com a service_role key antes de rodar."
  exit 1
}
if (-not (Test-Path -LiteralPath $BasePath)) {
  Write-Error "Pasta base não encontrada: $BasePath"
  exit 1
}

# Trans+lit para ASCII: remove acentos (NFD + tira marcas) e troca o resto por '_'.
function ConvertTo-AsciiKey([string]$s) {
  $n = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($c in $n.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($c)
    }
  }
  $r = $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
  -join ($r.ToCharArray() | ForEach-Object { if ([int]$_ -gt 127) { '_' } else { $_ } })
}

$ok = 0; $fail = 0
Get-ChildItem -LiteralPath $BasePath -Directory | ForEach-Object {
  $cliente = $_.Name
  Get-ChildItem -LiteralPath $_.FullName -File | ForEach-Object {
    $file = $_
    $key2 = "$(ConvertTo-AsciiKey $cliente)/$(ConvertTo-AsciiKey $file.Name)"
    $seg = ($key2 -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }
    $url = "https://$ProjectRef.supabase.co/storage/v1/object/$Bucket/$($seg -join '/')"
    $ct = switch ($file.Extension.ToLower()) {
      ".pdf"  { "application/pdf" }
      ".docx" { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
      ".doc"  { "application/msword" }
      ".png"  { "image/png" }
      ".jpg"  { "image/jpeg" }
      ".jpeg" { "image/jpeg" }
      default { "application/octet-stream" }
    }
    $headers = @{ Authorization = "Bearer $key"; apikey = $key; 'x-upsert' = 'true'; 'Content-Type' = $ct }
    try {
      Invoke-RestMethod -Method Post -Uri $url -Headers $headers -InFile $file.FullName -TimeoutSec 120 | Out-Null
      Write-Host ("  OK   {0}" -f $key2) -ForegroundColor Green
      $ok++
    } catch {
      Write-Host ("  FALHA {0} -> {1}" -f $key2, $_.Exception.Message) -ForegroundColor Red
      $fail++
    }
  }
}
Write-Host ""
Write-Host ("Concluído. Enviados: {0} | Falhas: {1}" -f $ok, $fail) -ForegroundColor Cyan
