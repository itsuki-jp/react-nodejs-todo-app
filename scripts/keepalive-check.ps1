# 20分後検証用: Renderスリープ→起動→DB到達(401)を1回だけ確認する。
# 成功条件: HTTP 401 または 200(DBまで届いた証明)。400/500は失敗。000系は60秒待って最大3回再試行。
# 実行結果は同フォルダの keepalive-check.log に追記される。
$AppUrl = "https://samurai-todo-app.onrender.com"
$Log = Join-Path $PSScriptRoot "keepalive-check.log"
$BodyFile = Join-Path $PSScriptRoot ".keepalive-body.tmp"
$RespFile = Join-Path $PSScriptRoot ".keepalive-resp.tmp"
$ErrFile = Join-Path $PSScriptRoot ".keepalive-err.tmp"

"=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') start ===" | Tee-Object -FilePath $Log -Append
"whoami=$(whoami) curl=$(Get-Command curl.exe -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })" | Tee-Object -FilePath $Log -Append
'{"email":"keepalive@example.com","password":"keepalive123"}' | Set-Content -LiteralPath $BodyFile -Encoding ascii -NoNewline

# 予備確認: タスク実行環境から外への疎通自体を切り分ける
$pre = & curl.exe -s -o NUL -w "%{http_code}" --max-time 30 "https://www.google.com/generate_204" 2> $ErrFile
$preExit = $LASTEXITCODE
if ([string]::IsNullOrEmpty($pre)) { $pre = "NOOUT" }
$preErr = if (Test-Path $ErrFile) { (Get-Content -LiteralPath $ErrFile -Raw -ErrorAction SilentlyContinue) } else { "" }
"preflight google: HTTP $pre exit=$preExit err=$preErr" | Tee-Object -FilePath $Log -Append

for ($i = 1; $i -le 3; $i++) {
  $code = "000"
  $curlExit = -1
  $elapsed = -1
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $out = & curl.exe -s -o $RespFile -w "%{http_code}" --max-time 120 -X POST "$AppUrl/api/auth/login" -H "Content-Type: application/json" --data-binary "@$BodyFile" 2> $ErrFile
  $curlExit = $LASTEXITCODE
  $sw.Stop()
  if ($out -match '(\d{3})\s*$') { $code = $Matches[1] }
  $elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  $body = if (Test-Path $RespFile) { (Get-Content -LiteralPath $RespFile -Raw -ErrorAction SilentlyContinue) } else { "" }
  $err = if (Test-Path $ErrFile) { (Get-Content -LiteralPath $ErrFile -Raw -ErrorAction SilentlyContinue) } else { "" }
  "$(Get-Date -Format 'HH:mm:ss') Attempt $i : HTTP $code exit=$curlExit (${elapsed}s) body=$body err=$err" | Tee-Object -FilePath $Log -Append

  if ($code -eq "401" -or $code -eq "200") {
    "SUCCESS: DB reached (HTTP $code)" | Tee-Object -FilePath $Log -Append
    Remove-Item -LiteralPath $BodyFile, $RespFile, $ErrFile -ErrorAction SilentlyContinue
    exit 0
  }
  if ($code -eq "400" -or $code -eq "500") {
    "FAIL: HTTP $code (no retry)" | Tee-Object -FilePath $Log -Append
    Remove-Item -LiteralPath $BodyFile, $RespFile, $ErrFile -ErrorAction SilentlyContinue
    exit 1
  }
  if ($i -lt 3) { Start-Sleep -Seconds 60 }
}

"FAIL: 3 attempts exhausted" | Tee-Object -FilePath $Log -Append
Remove-Item -LiteralPath $BodyFile, $RespFile, $ErrFile -ErrorAction SilentlyContinue
exit 1
