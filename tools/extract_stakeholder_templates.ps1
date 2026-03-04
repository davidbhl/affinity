param(
    [string]$SvgPath = "C:\Users\david.brownstein\Downloads\Stakeholder Mapping.svg",
    [string]$OutputDir = (Join-Path $PSScriptRoot "..\templates"),
    [double]$HighErrorThreshold = 35.0,
    [string[]]$ExpectedOutlierEdges = @(
        "Craig|Origin",
        "Leadership & Direction|Tom"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Parse-Translate {
    param([string]$Transform)
    $match = [regex]::Match(
        $Transform,
        "translate\(\s*([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)\s*,\s*([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)\s*\)"
    )
    if (-not $match.Success) {
        return @(0.0, 0.0)
    }
    return @([double]$match.Groups[1].Value, [double]$match.Groups[2].Value)
}

function Parse-PathEndpoints {
    param([string]$PathData)
    $matches = [regex]::Matches($PathData, "[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
    if ($matches.Count -lt 4) {
        throw "Unable to parse endpoints from path data: $PathData"
    }

    $values = @($matches | ForEach-Object { [double]$_.Value })
    return [pscustomobject]@{
        StartX = $values[0]
        StartY = $values[1]
        EndX   = $values[$values.Count - 2]
        EndY   = $values[$values.Count - 1]
    }
}

function Clean-Label {
    param([string]$Value)
    if ([string]::IsNullOrEmpty($Value)) {
        return ""
    }

    $decoded = [System.Net.WebUtility]::HtmlDecode($Value)
    $decoded = $decoded -replace [string][char]0x00C2, ""
    $decoded = $decoded -replace [string][char]0x00A0, " "
    $decoded = $decoded -replace "\s+", " "
    return $decoded.Trim()
}

function Infer-Type {
    param(
        [double]$Width,
        [double]$Height
    )
    $size = [Math]::Max($Width, $Height)
    if ($size -ge 185.9) {
        return "cluster"
    }
    if ($size -ge 140.0) {
        return "team"
    }
    return "person"
}

function Find-NearestNode {
    param(
        [double]$X,
        [double]$Y,
        [System.Collections.Generic.List[object]]$Nodes
    )
    $bestNode = $null
    $bestFitError = [double]::PositiveInfinity
    $bestDistance = [double]::PositiveInfinity

    foreach ($node in $Nodes) {
        $dx = $X - $node.center_x
        $dy = $Y - $node.center_y
        $distance = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))
        $fitError = [Math]::Abs($distance - $node.radius)
        if ($fitError -lt $bestFitError) {
            $bestFitError = $fitError
            $bestDistance = $distance
            $bestNode = $node
        }
    }

    return [pscustomobject]@{
        node      = $bestNode
        fit_error = $bestFitError
        distance  = $bestDistance
    }
}

if (-not (Test-Path -LiteralPath $SvgPath)) {
    throw "SVG file not found: $SvgPath"
}

[xml]$svgXml = Get-Content -LiteralPath $SvgPath -Raw
$groups = $svgXml.SelectNodes("//*[local-name()='g' and @width and @height and @transform]")

$nodeGroups = @(
    $groups | Where-Object {
        $_.SelectNodes(".//*[local-name()='text']").Count -gt 0 -and
        $_.SelectNodes(".//*[local-name()='path']").Count -eq 0
    }
)

$nodes = New-Object System.Collections.Generic.List[object]
foreach ($group in $nodeGroups) {
    $textNodes = @($group.SelectNodes(".//*[local-name()='text']"))
    $rawLabel = ($textNodes | ForEach-Object { $_.InnerText }) -join " "
    $label = Clean-Label -Value $rawLabel
    if ([string]::IsNullOrWhiteSpace($label)) {
        continue
    }

    $width = [double](($group.GetAttribute("width")) -replace "px", "")
    $height = [double](($group.GetAttribute("height")) -replace "px", "")
    $translate = Parse-Translate -Transform $group.GetAttribute("transform")
    $centerX = $translate[0] + ($width / 2.0)
    $centerY = $translate[1] + ($height / 2.0)
    $radius = [Math]::Min($width, $height) / 2.0

    $isFuture = $false
    if ($label -match "\(Future\)") {
        $isFuture = $true
    } elseif ($group.OuterXml -match "(?i)#b0b0b0") {
        $isFuture = $true
    }

    $nodes.Add([pscustomobject]@{
            id       = $label
            label    = $label
            type     = Infer-Type -Width $width -Height $height
            group    = ""
            subgroup = ""
            tags     = ""
            status   = if ($isFuture) { "future" } else { "" }
            center_x = $centerX
            center_y = $centerY
            radius   = $radius
        })
}

$duplicateNodeIds = @(
    $nodes |
    Group-Object -Property id |
    Where-Object { $_.Count -gt 1 }
)
if ($duplicateNodeIds.Count -gt 0) {
    $duplicateList = ($duplicateNodeIds | Select-Object -ExpandProperty Name) -join ", "
    throw "Duplicate node IDs found after cleaning: $duplicateList"
}

$connectorGroups = @(
    $groups | Where-Object {
        $_.SelectNodes(".//*[local-name()='path']").Count -gt 0 -and
        $_.SelectNodes(".//*[local-name()='text']").Count -eq 0 -and
        $_.SelectNodes(".//*[local-name()='ellipse']").Count -eq 0
    }
)

$edgeKeySet = New-Object "System.Collections.Generic.HashSet[string]"
$edges = New-Object System.Collections.Generic.List[object]

foreach ($group in $connectorGroups) {
    $path = $group.SelectSingleNode(".//*[local-name()='path']")
    if ($null -eq $path) {
        continue
    }

    $pathData = $path.GetAttribute("d")
    if ([string]::IsNullOrWhiteSpace($pathData)) {
        continue
    }

    $endpoints = Parse-PathEndpoints -PathData $pathData
    $translate = Parse-Translate -Transform $group.GetAttribute("transform")

    $startX = $translate[0] + $endpoints.StartX
    $startY = $translate[1] + $endpoints.StartY
    $endX = $translate[0] + $endpoints.EndX
    $endY = $translate[1] + $endpoints.EndY

    $startMatch = Find-NearestNode -X $startX -Y $startY -Nodes $nodes
    $endMatch = Find-NearestNode -X $endX -Y $endY -Nodes $nodes

    $source = [string]$startMatch.node.id
    $target = [string]$endMatch.node.id
    if ([string]::CompareOrdinal($source, $target) -gt 0) {
        $tmp = $source
        $source = $target
        $target = $tmp
    }

    $edgeKey = "$source$([char]31)$target"
    if ($edgeKeySet.Add($edgeKey)) {
        $edges.Add([pscustomobject]@{
                source          = $source
                target          = $target
                kind            = "relates_to"
                directed        = "false"
                weight          = "1"
                start_fit_error = $startMatch.fit_error
                end_fit_error   = $endMatch.fit_error
            })
    }
}

$expectedOutlierPairs = New-Object System.Collections.Generic.List[object]
$expectedOutlierKeySet = New-Object "System.Collections.Generic.HashSet[string]"
foreach ($pair in $ExpectedOutlierEdges) {
    $parts = $pair -split "\|", 2
    if ($parts.Count -ne 2 -or [string]::IsNullOrWhiteSpace($parts[0]) -or [string]::IsNullOrWhiteSpace($parts[1])) {
        throw "Invalid ExpectedOutlierEdges item '$pair'. Use 'Node A|Node B'."
    }
    $a = $parts[0].Trim()
    $b = $parts[1].Trim()
    if ([string]::CompareOrdinal($a, $b) -gt 0) {
        $tmp = $a
        $a = $b
        $b = $tmp
    }
    $pairKey = "$a$([char]31)$b"
    if ($expectedOutlierKeySet.Add($pairKey)) {
        $expectedOutlierPairs.Add([pscustomobject]@{
                source = $a
                target = $b
                key    = $pairKey
            })
    }
}

$nodeIdSet = New-Object "System.Collections.Generic.HashSet[string]"
foreach ($node in $nodes) {
    [void]$nodeIdSet.Add([string]$node.id)
}

if ($nodes.Count -ne 81) {
    throw "Validation failed: expected 81 nodes, got $($nodes.Count)"
}
if ($connectorGroups.Count -ne 94) {
    throw "Validation failed: expected 94 connector paths, got $($connectorGroups.Count)"
}
if ($edges.Count -ne 94) {
    throw "Validation failed: expected 94 edges after dedupe, got $($edges.Count)"
}
if (@($nodes | Where-Object { [string]::IsNullOrWhiteSpace($_.id) -or [string]::IsNullOrWhiteSpace($_.label) }).Count -gt 0) {
    throw "Validation failed: found empty node id/label."
}
if (@($edges | Where-Object {
            [string]::IsNullOrWhiteSpace($_.source) -or
            [string]::IsNullOrWhiteSpace($_.target) -or
            -not $nodeIdSet.Contains([string]$_.source) -or
            -not $nodeIdSet.Contains([string]$_.target)
        }).Count -gt 0) {
    throw "Validation failed: found edges with missing/unknown source or target."
}
if (@($edges | Where-Object { $_.source -eq $_.target }).Count -gt 0) {
    throw "Validation failed: self-loop edge(s) detected."
}
if (@($expectedOutlierPairs | Where-Object { -not $edgeKeySet.Contains($_.key) }).Count -gt 0) {
    $missingPairs = @(
        $expectedOutlierPairs |
        Where-Object { -not $edgeKeySet.Contains($_.key) } |
        ForEach-Object { "$($_.source) <-> $($_.target)" }
    ) -join ", "
    throw "Validation failed: expected outlier edge(s) not found: $missingPairs"
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDir)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$nodesCsvPath = Join-Path $outputPath "nodes.csv"
$edgesCsvPath = Join-Path $outputPath "edges.csv"
$readmePath = Join-Path $outputPath "README.md"

$nodes |
Select-Object id, label, type, group, subgroup, tags, status |
Sort-Object label |
Export-Csv -LiteralPath $nodesCsvPath -NoTypeInformation -Encoding UTF8

$edges |
Select-Object source, target, kind, directed, weight |
Sort-Object source, target |
Export-Csv -LiteralPath $edgesCsvPath -NoTypeInformation -Encoding UTF8

$edgeErrorStats = @(
    $edges |
    ForEach-Object {
        $maxError = [Math]::Max([double]$_.start_fit_error, [double]$_.end_fit_error)
        [pscustomobject]@{
            source    = $_.source
            target    = $_.target
            max_error = [Math]::Round($maxError, 2)
        }
    } |
    Sort-Object max_error -Descending
)

$edgeErrorByKey = @{}
foreach ($edgeStat in $edgeErrorStats) {
    $key = "$($edgeStat.source)$([char]31)$($edgeStat.target)"
    $edgeErrorByKey[$key] = $edgeStat
}

$thresholdFlags = @($edgeErrorStats | Where-Object { $_.max_error -ge $HighErrorThreshold })
$topOutliers = @($edgeErrorStats | Where-Object { $_.max_error -gt 1.0 } | Select-Object -First 5)
if ($topOutliers.Count -eq 0) {
    $topOutliers = @($edgeErrorStats | Select-Object -First 5)
}
$flaggedEdges = @(
    $thresholdFlags + $topOutliers |
    Group-Object source, target |
    ForEach-Object { $_.Group | Sort-Object max_error -Descending | Select-Object -First 1 } |
    Sort-Object max_error -Descending
)

$runDate = Get-Date -Format "yyyy-MM-dd"
$flaggedLines = if ($flaggedEdges.Count -gt 0) {
    ($flaggedEdges | ForEach-Object { "- $($_.source) <-> $($_.target) (max endpoint-fit error: $($_.max_error))" }) -join [Environment]::NewLine
} else {
    "- None"
}
$expectedOutlierLines = if ($expectedOutlierPairs.Count -gt 0) {
    (
        $expectedOutlierPairs |
        ForEach-Object {
            $stat = $edgeErrorByKey[$_.key]
            if ($null -ne $stat) {
                "- $($_.source) <-> $($_.target) (confirmed, max endpoint-fit error: $($stat.max_error))"
            } else {
                "- $($_.source) <-> $($_.target) (missing)"
            }
        }
    ) -join [Environment]::NewLine
} else {
    "- None configured"
}

$readmeContent = @"
# Stakeholder Template Extraction

Source SVG: $SvgPath
Extraction date: $runDate
Script: tools/extract_stakeholder_templates.ps1

Generated files:
- nodes.csv
- edges.csv

Node schema (nodes.csv):
- id,label,type,group,subgroup,tags,status
- id and label are cleaned human-readable labels.
- type is inferred from node size:
  - ~115.2 => person
  - ~152.6 => team
  - >= ~186.4 => cluster
- status is future when label includes (Future) or faded fill styling is detected.
- group, subgroup, and tags are intentionally blank.

Edge schema (edges.csv):
- source,target,kind,directed,weight
- kind is always relates_to
- directed is always false
- weight is always 1
- Relationships are treated as undirected and deduplicated (A-B same as B-A).

Validation checks:
- nodes.csv row count is exactly 81
- Connector path count is exactly 94
- edges.csv row count is exactly 94
- Node IDs are unique
- Every edge endpoint exists in nodes.csv
- No empty IDs/labels/sources/targets
- No self-loop edges

High endpoint-fit edges (visual QA candidates):
$flaggedLines

Expected outlier checks:
$expectedOutlierLines

Known caveats:
- Endpoint mapping uses nearest node boundary distance and can produce outliers for long or crossing curves.
- Keep IDs human-readable (no slug conversion) to match source labels exactly.
"@

$readmeContent | Set-Content -LiteralPath $readmePath -Encoding UTF8

Write-Host "Generated: $nodesCsvPath"
Write-Host "Generated: $edgesCsvPath"
Write-Host "Generated: $readmePath"
Write-Host "Validated counts: nodes=$($nodes.Count), connectors=$($connectorGroups.Count), edges=$($edges.Count)"
Write-Host "Validated expected outlier edges: $($expectedOutlierPairs.Count)"
