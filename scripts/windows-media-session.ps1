param(
    [ValidateSet("snapshot", "play", "pause", "next", "previous", "shuffle", "mute")]
    [string]$Action = "snapshot",
    [ValidateSet("music", "apple", "spotify")]
    [string]$Provider = "music"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Result($value) {
    [Console]::Out.Write(($value | ConvertTo-Json -Compress -Depth 5))
}

if (-not [System.Environment]::OSVersion.Platform.ToString().StartsWith("Win")) {
    Write-Result ([pscustomobject]@{ available = $false; detail = "Windows media controls are available on Windows only." })
    exit 0
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]

    function Await-WinRt($operation, $resultType) {
        $method = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
            $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1
        })[0]
        $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
        $task.Wait()
        return $task.Result
    }

    $manager = Await-WinRt `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $sessions = @($manager.GetSessions())
    $current = $manager.GetCurrentSession()
    $providerName = if ($Provider -eq "apple") { "Apple Music" } elseif ($Provider -eq "spotify") { "Spotify" } else { "Music" }
    $providerPattern = if ($Provider -eq "apple") { "AppleMusic|AppleInc" } elseif ($Provider -eq "spotify") { "Spotify" } else { $null }
    $matching = if ($providerPattern) { $sessions | Where-Object { $_.SourceAppUserModelId -match $providerPattern } | Select-Object -First 1 } else { $null }
    $matchingPlaying = if ($providerPattern) { $sessions | Where-Object { $_.SourceAppUserModelId -match $providerPattern -and $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq "Playing" } | Select-Object -First 1 } else { $null }
    $playing = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq "Playing" } | Select-Object -First 1
    $apple = $sessions | Where-Object { $_.SourceAppUserModelId -match "AppleMusic|AppleInc" } | Select-Object -First 1
    $session = if ($matchingPlaying) { $matchingPlaying } elseif ($playing) { $playing } elseif ($matching) { $matching } elseif ($Provider -eq "music" -and $apple) { $apple } elseif ($current) { $current } else { $sessions | Select-Object -First 1 }

    if ($null -eq $session) {
        Write-Result ([pscustomobject]@{
            available = $false
            ready = $false
            playing = $false
            title = "Nothing playing"
            artist = $providerName
            album = "Start a track in $providerName or the web player"
            artwork = "/assets/album-cover.png"
            elapsed = 0
            duration = 0
            shuffled = $false
            detail = "Start playback once, then Live Desktop can control it through Windows."
        })
        exit 0
    }

    $actionSucceeded = $true
    switch ($Action) {
        "play" { $actionSucceeded = Await-WinRt ($session.TryPlayAsync()) ([bool]) }
        "pause" { $actionSucceeded = Await-WinRt ($session.TryPauseAsync()) ([bool]) }
        "next" { $actionSucceeded = Await-WinRt ($session.TrySkipNextAsync()) ([bool]) }
        "previous" { $actionSucceeded = Await-WinRt ($session.TrySkipPreviousAsync()) ([bool]) }
        "shuffle" {
            $before = $session.GetPlaybackInfo()
            $shuffleActive = if ($null -eq $before.IsShuffleActive) { $false } else { [bool]$before.IsShuffleActive }
            $actionSucceeded = Await-WinRt ($session.TryChangeShuffleActiveAsync(-not $shuffleActive)) ([bool])
        }
        "mute" {
            if (-not ("LiveDesktop.AudioKeys" -as [type])) {
                Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
namespace LiveDesktop {
    public static class AudioKeys {
        [DllImport("user32.dll")]
        public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, uint extraInfo);
    }
}
"@
            }
            [LiveDesktop.AudioKeys]::keybd_event(0xAD, 0, 0, 0)
            [LiveDesktop.AudioKeys]::keybd_event(0xAD, 0, 2, 0)
        }
    }

    Start-Sleep -Milliseconds 120
    $properties = Await-WinRt `
        ($session.TryGetMediaPropertiesAsync()) `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $playback = $session.GetPlaybackInfo()
    $timeline = $session.GetTimelineProperties()
    $artwork = "/assets/album-cover.png"

    try {
        if ($null -ne $properties.Thumbnail) {
            $null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
            $stream = Await-WinRt `
                ($properties.Thumbnail.OpenReadAsync()) `
                ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
            $netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
            $memory = [System.IO.MemoryStream]::new()
            $netStream.CopyTo($memory)
            if ($memory.Length -gt 0 -and $memory.Length -lt 5242880) {
                $contentType = if ([string]::IsNullOrWhiteSpace($stream.ContentType)) { "image/jpeg" } else { $stream.ContentType }
                $artwork = "data:$contentType;base64," + [Convert]::ToBase64String($memory.ToArray())
            }
            $memory.Dispose()
            $netStream.Dispose()
            $stream.Dispose()
        }
    } catch {
        $artwork = "/assets/album-cover.png"
    }

    $shuffle = if ($null -eq $playback.IsShuffleActive) { $false } else { [bool]$playback.IsShuffleActive }
    $status = $playback.PlaybackStatus.ToString()
    Write-Result ([pscustomobject]@{
        available = $true
        ready = $true
        source = $session.SourceAppUserModelId
        playing = $status -eq "Playing"
        status = $status
        title = if ([string]::IsNullOrWhiteSpace($properties.Title)) { "Untitled track" } else { $properties.Title }
        artist = if ([string]::IsNullOrWhiteSpace($properties.Artist)) { "Unknown artist" } else { $properties.Artist }
        album = if ([string]::IsNullOrWhiteSpace($properties.AlbumTitle)) { $providerName } else { $properties.AlbumTitle }
        artwork = $artwork
        elapsed = [math]::Max(0, $timeline.Position.TotalSeconds)
        duration = [math]::Max(0, $timeline.EndTime.TotalSeconds)
        shuffled = $shuffle
        actionSucceeded = [bool]$actionSucceeded
        detail = "Controlled locally through Windows media controls."
    })
} catch {
    Write-Result ([pscustomobject]@{
        available = $false
        ready = $false
        playing = $false
        title = "Nothing playing"
        artist = if ($Provider -eq "apple") { "Apple Music" } elseif ($Provider -eq "spotify") { "Spotify" } else { "Music" }
        album = "Start a track in your selected music player"
        artwork = "/assets/album-cover.png"
        elapsed = 0
        duration = 0
        shuffled = $false
        detail = "Windows media controls are unavailable: $($_.Exception.Message)"
    })
}
