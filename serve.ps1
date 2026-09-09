param([int]$Port = 5500)

$root = $PSScriptRoot
$mime = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript";
  ".json" = "application/json"; ".png" = "image/png"; ".jpg" = "image/jpeg";
  ".svg" = "image/svg+xml"; ".ico" = "image/x-icon";
}

$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any, $Port)
$listener.Start()
Write-Host "Sirviendo $root en el puerto $Port (accesible desde la red local)"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 2000
    $client.SendTimeout = 2000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    while ($reader.Peek() -ge 0 -and $reader.ReadLine() -ne "") {}

    if ($requestLine) {
      $path = "/index.html"
      if ($requestLine -match '^\w+\s+(\S+)\s+HTTP') {
        $path = $Matches[1]
        if ($path -eq "/") { $path = "/index.html" }
        $path = [System.Uri]::UnescapeDataString($path.Split('?')[0])
      }
      $filePath = Join-Path $root ($path.TrimStart("/"))

      if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        $contentType = $mime[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nCache-Control: no-store`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($bytes, 0, $bytes.Length)
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
      }
      $stream.Flush()
    }
  } catch {
  } finally {
    $client.Close()
  }
}
