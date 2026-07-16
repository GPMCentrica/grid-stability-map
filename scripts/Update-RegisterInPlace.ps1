param(
  [string]$WorkbookPath
)

$workspacePath = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $WorkbookPath) { $WorkbookPath = Join-Path $workspacePath 'UK Generation Retirement Register.xlsx' }
if (-not (Test-Path $WorkbookPath)) { throw "Workbook was not found: $WorkbookPath" }

$xlSrcRange = 1
$xlYes = 1
$xlValidateList = 3
$xlValidateWholeNumber = 1
$xlValidateDecimal = 2
$xlValidateDate = 4
$xlValidAlertStop = 1
$xlBetween = 1
$xlExpression = 2

function Add-ListValidation([object]$range, [string]$formula) {
  $range.Validation.Delete()
  $range.Validation.Add($xlValidateList, $xlValidAlertStop, $xlBetween, $formula) | Out-Null
  $range.Validation.IgnoreBlank = $true
  $range.Validation.InCellDropdown = $true
}

function Style-Title([object]$sheet, [string]$title, [string]$rangeAddress) {
  $range = $sheet.Range($rangeAddress)
  $range.Merge()
  $range.Value2 = $title
  $range.Font.Name = 'Aptos Display'
  $range.Font.Size = 20
  $range.Font.Bold = $true
  $range.Font.Color = 16777215
  $range.Interior.Color = 3351551
  $range.HorizontalAlignment = -4131
  $range.VerticalAlignment = -4108
}

function NodeScoreFormula([int]$horizonRow, [int]$nodeRow) {
  $formula = @'
=IFERROR(SETTINGS!$B$10*(1-SUMPRODUCT((PLANT_DATA!$C$2:$C$500=$A2)*((PLANT_DATA!$H$2:$H$500="")+(PLANT_DATA!$H$2:$H$500>DATE(SETTINGS!$B${0},12,31)))*PLANT_DATA!$K$2:$K$500)/SUMIF(PLANT_DATA!$C$2:$C$500,$A2,PLANT_DATA!$K$2:$K$500))+SETTINGS!$B$11*(1-SUMPRODUCT((PLANT_DATA!$C$2:$C$500=$A2)*((PLANT_DATA!$H$2:$H$500="")+(PLANT_DATA!$H$2:$H$500>DATE(SETTINGS!$B${0},12,31)))*PLANT_DATA!$L$2:$L$500)/SUMIF(PLANT_DATA!$C$2:$C$500,$A2,PLANT_DATA!$L$2:$L$500))+SETTINGS!$B$12*(1-SUMPRODUCT((PLANT_DATA!$C$2:$C$500=$A2)*((PLANT_DATA!$H$2:$H$500="")+(PLANT_DATA!$H$2:$H$500>DATE(SETTINGS!$B${0},12,31)))*PLANT_DATA!$M$2:$M$500)/SUMIF(PLANT_DATA!$C$2:$C$500,$A2,PLANT_DATA!$M$2:$M$500)),0)
'@ -f $horizonRow
  $formula.Replace('$A2', ('$A' + $nodeRow))
}

$backupPath = Join-Path (Split-Path $WorkbookPath -Parent) ("UK Generation Retirement Register - Backup {0}.xlsx" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
Copy-Item $WorkbookPath $backupPath -ErrorAction Stop

$excel = $null
$workbook = $null
$isComplete = $false
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false
  $workbook = $excel.Workbooks.Open($WorkbookPath, $null, $false)
  $plantSheet = $workbook.Worksheets.Item('PLANT_DATA')
  $sourceRows = $plantSheet.UsedRange.Rows.Count

  $plants = @()
  for ($row = 2; $row -le $sourceRows; $row += 1) {
    $plants += [PSCustomObject]@{
      AssetId = $plantSheet.Cells.Item($row, 1).Value2
      PlantName = $plantSheet.Cells.Item($row, 2).Value2
      NodeId = $plantSheet.Cells.Item($row, 3).Value2
      NodeName = $plantSheet.Cells.Item($row, 4).Value2
      Region = $plantSheet.Cells.Item($row, 5).Value2
      Technology = $plantSheet.Cells.Item($row, 6).Value2
      NetMw = $plantSheet.Cells.Item($row, 7).Value2
      RetirementDate = $plantSheet.Cells.Item($row, 8).Value2
      RetirementClass = $plantSheet.Cells.Item($row, 9).Value2
      Confidence = $plantSheet.Cells.Item($row, 10).Value2
      EvidenceFlag = $plantSheet.Cells.Item($row, 14).Value2
    }
  }

  $regions = @($plants.Region | Where-Object { $_ } | Sort-Object -Unique)
  $technologies = @($plants.Technology | Where-Object { $_ } | Sort-Object -Unique)
  $retirementClasses = @($plants.RetirementClass | Where-Object { $_ } | Sort-Object -Unique)
  $evidenceFlags = @($plants.EvidenceFlag | Where-Object { $_ } | Sort-Object -Unique)
  $nodes = @($plants | Group-Object NodeId | ForEach-Object {
    $first = $_.Group | Select-Object -First 1
    [PSCustomObject]@{ NodeId = $first.NodeId; NodeName = $first.NodeName; Region = $first.Region }
  } | Sort-Object NodeName)

  foreach ($sheetName in @('EXEC_SUMMARY', 'CORE_MODEL', 'OUTPUTS', 'CONTROL', 'OVERVIEW', 'SETTINGS', 'DATA_CHECKS', 'LOOKUPS')) {
    $existing = $workbook.Worksheets | Where-Object Name -eq $sheetName
    if ($existing) { $existing.Delete() }
  }

  foreach ($table in @($plantSheet.ListObjects)) { $table.Unlist() }
  $plantSheet.Cells.Clear()
  $plantHeaders = @('Asset ID', 'Plant name', 'Node ID', 'Node / substation', 'Region', 'Technology type', 'Net MW', 'Retirement date (most likely)', 'Retirement class', 'Confidence score', 'Inertia proxy (MVA.s eq.)', 'Fault-level proxy (MVA)', 'Reactive proxy (MVAr)', 'Evidence flag', 'Analyst notes')
  for ($column = 0; $column -lt $plantHeaders.Count; $column += 1) { $plantSheet.Cells.Item(1, $column + 1).Value2 = $plantHeaders[$column] }
  for ($index = 0; $index -lt $plants.Count; $index += 1) {
    $row = $index + 2
    $plant = $plants[$index]
    $plantSheet.Cells.Item($row, 1).Value2 = $plant.AssetId
    $plantSheet.Cells.Item($row, 2).Value2 = $plant.PlantName
    $plantSheet.Cells.Item($row, 3).Value2 = $plant.NodeId
    $plantSheet.Cells.Item($row, 4).Value2 = $plant.NodeName
    $plantSheet.Cells.Item($row, 5).Value2 = $plant.Region
    $plantSheet.Cells.Item($row, 6).Value2 = $plant.Technology
    $plantSheet.Cells.Item($row, 7).Value2 = [string]$plant.NetMw
    if ($plant.RetirementDate) { $plantSheet.Cells.Item($row, 8).Value2 = [string]$plant.RetirementDate }
    $plantSheet.Cells.Item($row, 9).Value2 = $plant.RetirementClass
    $plantSheet.Cells.Item($row, 10).Value2 = [string]$plant.Confidence
    $plantSheet.Cells.Item($row, 14).Value2 = $plant.EvidenceFlag
  }
  $plantTable = $plantSheet.ListObjects.Add($xlSrcRange, $plantSheet.Range("A1:O$($plants.Count + 1)"), $null, $xlYes)
  $plantTable.Name = 'PlantRegister'
  $plantTable.TableStyle = 'TableStyleMedium2'
  $plantSheet.Range("A2:J$($plants.Count + 1)").Interior.Color = 15724527
  $plantSheet.Range("N2:O$($plants.Count + 1)").Interior.Color = 15724527
  $plantSheet.Range("K2:M$($plants.Count + 1)").Interior.Color = 15132390
  $plantSheet.Range("G2:G$($plants.Count + 1)").NumberFormat = '#,##0'
  $plantSheet.Range("H2:H$($plants.Count + 1)").NumberFormat = 'dd/mm/yyyy'
  $plantSheet.Range("J2:J$($plants.Count + 1)").NumberFormat = '0'
  $plantSheet.Range("K2:M$($plants.Count + 1)").NumberFormat = '#,##0.0'
  $plantSheet.Columns('A:O').AutoFit() | Out-Null
  $plantSheet.Columns('B').ColumnWidth = 30
  $plantSheet.Columns('D').ColumnWidth = 24
  $plantSheet.Columns('F').ColumnWidth = 29
  $plantSheet.Columns('O').ColumnWidth = 36

  $overview = $workbook.Worksheets.Add()
  $overview.Name = 'OVERVIEW'
  $settingsSheet = $workbook.Worksheets.Add()
  $settingsSheet.Name = 'SETTINGS'
  $coreSheet = $workbook.Worksheets.Add()
  $coreSheet.Name = 'CORE_MODEL'
  $outputsSheet = $workbook.Worksheets.Add()
  $outputsSheet.Name = 'OUTPUTS'
  $checksSheet = $workbook.Worksheets.Add()
  $checksSheet.Name = 'DATA_CHECKS'
  $lookupsSheet = $workbook.Worksheets.Add()
  $lookupsSheet.Name = 'LOOKUPS'

  Style-Title $settingsSheet 'Model settings' 'A1:C2'
  $settingsSheet.Range('A4:C4').Value2 = @('Parameter', 'Editable value', 'Purpose')
  $settings = @(
    @('Baseline year', 2026, 'Reference year for current position'),
    @('Near-term horizon', 2030, 'First planning horizon'),
    @('Mid-term horizon', 2040, 'Second planning horizon'),
    @('Long-term horizon', 2050, 'Third planning horizon'),
    @('', '', ''),
    @('Inertia weight', 0.4, 'Composite risk weight'),
    @('Fault weight', 0.4, 'Composite risk weight'),
    @('Reactive weight', 0.2, 'Composite risk weight'),
    @('', '', ''),
    @('Critical gap threshold', 0.7, 'Score at or above this is Critical gap'),
    @('Under pressure threshold', 0.25, 'Score at or above this is Under pressure'),
    @('Low confidence threshold', 60, 'Confidence score below this needs review'),
    @('', '', ''),
    @('Inertia factor per MW', 5, 'Automatic proxy multiplier'),
    @('Fault factor per MW', 1.1, 'Automatic proxy multiplier'),
    @('Reactive factor per MW', 0.33, 'Automatic proxy multiplier')
  )
  for ($index = 0; $index -lt $settings.Count; $index += 1) {
    $settingsSheet.Cells.Item($index + 5, 1).Value2 = $settings[$index][0]
    $settingsSheet.Cells.Item($index + 5, 2).Value2 = [string]$settings[$index][1]
    $settingsSheet.Cells.Item($index + 5, 3).Value2 = $settings[$index][2]
  }
  $settingsSheet.Range('A4:C4').Font.Bold = $true
  $settingsSheet.Range('A4:C4').Interior.Color = 15132390
  $settingsSheet.Range('B5:B20').Interior.Color = 15724527
  $settingsSheet.Range('B9:B11').NumberFormat = '0.0'
  $settingsSheet.Range('B13:B14').NumberFormat = '0.00'
  $settingsSheet.Columns('A:C').AutoFit() | Out-Null
  $settingsSheet.Columns('A').ColumnWidth = 30
  $settingsSheet.Columns('C').ColumnWidth = 43
  for ($row = 2; $row -le $plants.Count + 1; $row += 1) {
    $plantSheet.Cells.Item($row, 11).Formula = "=IF(`$G$row=`"`",`"`",`$G$row*SETTINGS!`$B`$18)"
    $plantSheet.Cells.Item($row, 12).Formula = "=IF(`$G$row=`"`",`"`",`$G$row*SETTINGS!`$B`$19)"
    $plantSheet.Cells.Item($row, 13).Formula = "=IF(`$G$row=`"`",`"`",`$G$row*SETTINGS!`$B`$20)"
  }

  $lookupsSheet.Cells.Item(1, 1).Value2 = 'Regions'
  $lookupsSheet.Cells.Item(1, 2).Value2 = 'Technologies'
  $lookupsSheet.Cells.Item(1, 3).Value2 = 'Retirement classes'
  $lookupsSheet.Cells.Item(1, 4).Value2 = 'Evidence flags'
  for ($index = 0; $index -lt $regions.Count; $index += 1) { $lookupsSheet.Cells.Item($index + 2, 1).Value2 = $regions[$index] }
  for ($index = 0; $index -lt $technologies.Count; $index += 1) { $lookupsSheet.Cells.Item($index + 2, 2).Value2 = $technologies[$index] }
  for ($index = 0; $index -lt $retirementClasses.Count; $index += 1) { $lookupsSheet.Cells.Item($index + 2, 3).Value2 = $retirementClasses[$index] }
  for ($index = 0; $index -lt $evidenceFlags.Count; $index += 1) { $lookupsSheet.Cells.Item($index + 2, 4).Value2 = $evidenceFlags[$index] }
  $lookupsSheet.Range('A1:D1').Font.Bold = $true
  $lookupsSheet.Range('A1:D1').Interior.Color = 15132390
  $lookupsSheet.Columns('A:D').AutoFit() | Out-Null
  $workbook.Names.Add('RegionList', ('=LOOKUPS!$A$2:$A$' + ($regions.Count + 1))) | Out-Null
  $workbook.Names.Add('TechnologyList', ('=LOOKUPS!$B$2:$B$' + ($technologies.Count + 1))) | Out-Null
  $workbook.Names.Add('RetirementClassList', ('=LOOKUPS!$C$2:$C$' + ($retirementClasses.Count + 1))) | Out-Null
  if ($evidenceFlags.Count -gt 0) { $workbook.Names.Add('EvidenceFlagList', ('=LOOKUPS!$D$2:$D$' + ($evidenceFlags.Count + 1))) | Out-Null }
  Add-ListValidation $plantSheet.Range("E2:E500") '=RegionList'
  Add-ListValidation $plantSheet.Range("F2:F500") '=TechnologyList'
  Add-ListValidation $plantSheet.Range("I2:I500") '=RetirementClassList'
  if ($evidenceFlags.Count -gt 0) { Add-ListValidation $plantSheet.Range("N2:N500") '=EvidenceFlagList' }
  $plantSheet.Range('H2:H500').Validation.Add($xlValidateDate, $xlValidAlertStop, $xlBetween, '1/1/2000', '31/12/2100') | Out-Null
  $plantSheet.Range('G2:G500').Validation.Add($xlValidateDecimal, $xlValidAlertStop, 7, 0) | Out-Null
  $plantSheet.Range('J2:J500').Validation.Add($xlValidateWholeNumber, $xlValidAlertStop, $xlBetween, 0, 100) | Out-Null

  $coreHeaders = @('Node ID', 'Node name', 'Region', '2030 outlook', '2040 outlook', '2050 outlook', 'Timing class', 'Min confidence', 'Total MW', 'Asset count', 'Deficit 2030', 'Deficit 2040', 'Deficit 2050')
  for ($column = 0; $column -lt $coreHeaders.Count; $column += 1) { $coreSheet.Cells.Item(1, $column + 1).Value2 = $coreHeaders[$column] }
  for ($index = 0; $index -lt $nodes.Count; $index += 1) {
    $row = $index + 2
    $node = $nodes[$index]
    $coreSheet.Cells.Item($row, 1).Value2 = $node.NodeId
    $coreSheet.Cells.Item($row, 2).Value2 = $node.NodeName
    $coreSheet.Cells.Item($row, 3).Value2 = $node.Region
    $coreSheet.Cells.Item($row, 11).Formula = NodeScoreFormula 5 $row
    $coreSheet.Cells.Item($row, 12).Formula = NodeScoreFormula 6 $row
    $coreSheet.Cells.Item($row, 13).Formula = NodeScoreFormula 7 $row
    $coreSheet.Cells.Item($row, 4).Formula = "=IF(`$K$row>=SETTINGS!`$B`$14,`"Critical gap`",IF(`$K$row>=SETTINGS!`$B`$15,`"Under pressure`",`"Secure`"))"
    $coreSheet.Cells.Item($row, 5).Formula = "=IF(`$L$row>=SETTINGS!`$B`$14,`"Critical gap`",IF(`$L$row>=SETTINGS!`$B`$15,`"Under pressure`",`"Secure`"))"
    $coreSheet.Cells.Item($row, 6).Formula = "=IF(`$M$row>=SETTINGS!`$B`$14,`"Critical gap`",IF(`$M$row>=SETTINGS!`$B`$15,`"Under pressure`",`"Secure`"))"
    $coreSheet.Cells.Item($row, 7).Formula = "=IF(`$K$row>=SETTINGS!`$B`$14,`"Near-term`",IF(`$L$row>=SETTINGS!`$B`$14,`"Mid-term`",IF(`$M$row>=SETTINGS!`$B`$14,`"Long-term`",`"No critical gap`")))"
    $coreSheet.Cells.Item($row, 8).Formula = "=IFERROR(MINIFS(PLANT_DATA!`$J`$2:`$J`$500,PLANT_DATA!`$C`$2:`$C`$500,`$A$row),`"`")"
    $coreSheet.Cells.Item($row, 9).Formula = "=SUMIF(PLANT_DATA!`$C`$2:`$C`$500,`$A$row,PLANT_DATA!`$G`$2:`$G`$500)"
    $coreSheet.Cells.Item($row, 10).Formula = "=COUNTIF(PLANT_DATA!`$C`$2:`$C`$500,`$A$row)"
  }
  $coreTable = $coreSheet.ListObjects.Add($xlSrcRange, $coreSheet.Range("A1:M$($nodes.Count + 1)"), $null, $xlYes)
  $coreTable.Name = 'NodeRisk'
  $coreTable.TableStyle = 'TableStyleMedium9'
  $coreSheet.Range("H2:H$($nodes.Count + 1)").NumberFormat = '0'
  $coreSheet.Range("I2:I$($nodes.Count + 1)").NumberFormat = '#,##0 "MW"'
  $coreSheet.Range("K2:M$($nodes.Count + 1)").NumberFormat = '0.00'
  $coreSheet.Columns('A:M').AutoFit() | Out-Null
  $coreSheet.Columns('B').ColumnWidth = 26
  $coreSheet.Columns('D:F').ColumnWidth = 17
  $coreSheet.Columns('K:M').Hidden = $true
  $coreSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Critical gap"').Interior.Color = 13421823
  $coreSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Under pressure"').Interior.Color = 10092543
  $coreSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Secure"').Interior.Color = 13434828

  $outputHeaders = @('Node', '2030 outlook', '2040 outlook', '2050 outlook', 'Timing class', 'Confidence score', 'Deficit 2030', 'Deficit 2040', 'Deficit 2050')
  for ($column = 0; $column -lt $outputHeaders.Count; $column += 1) { $outputsSheet.Cells.Item(1, $column + 1).Value2 = $outputHeaders[$column] }
  for ($index = 0; $index -lt $nodes.Count; $index += 1) {
    $row = $index + 2
    $outputsSheet.Cells.Item($row, 1).Formula = "=CORE_MODEL!`$B$row"
    $outputsSheet.Cells.Item($row, 2).Formula = "=CORE_MODEL!`$D$row"
    $outputsSheet.Cells.Item($row, 3).Formula = "=CORE_MODEL!`$E$row"
    $outputsSheet.Cells.Item($row, 4).Formula = "=CORE_MODEL!`$F$row"
    $outputsSheet.Cells.Item($row, 5).Formula = "=CORE_MODEL!`$G$row"
    $outputsSheet.Cells.Item($row, 6).Formula = "=CORE_MODEL!`$H$row"
    $outputsSheet.Cells.Item($row, 7).Formula = "=CORE_MODEL!`$K$row"
    $outputsSheet.Cells.Item($row, 8).Formula = "=CORE_MODEL!`$L$row"
    $outputsSheet.Cells.Item($row, 9).Formula = "=CORE_MODEL!`$M$row"
  }
  $outputsTable = $outputsSheet.ListObjects.Add($xlSrcRange, $outputsSheet.Range("A1:I$($nodes.Count + 1)"), $null, $xlYes)
  $outputsTable.Name = 'LocationOutlook'
  $outputsTable.TableStyle = 'TableStyleMedium9'
  $outputsSheet.Columns('A:I').AutoFit() | Out-Null
  $outputsSheet.Columns('B:D').ColumnWidth = 17
  $outputsSheet.Columns('G:I').Hidden = $true

  Style-Title $overview 'UK Generation Retirement Register' 'A1:H2'
  $overview.Range('A4').Value2 = 'Editable generation retirement register and location stability outlook'
  $overview.Range('A4').Font.Bold = $true
  $overview.Range('A6:E6').Value2 = @('Outlook year', 'Capacity retiring by year', 'Assets retiring by year', 'Critical locations', 'Planning focus')
  $overview.Range('A7').Value2 = '2030'
  $overview.Range('A8').Value2 = '2040'
  $overview.Range('A9').Value2 = '2050'
  $overview.Range('B7').Formula = '=SUMIFS(PLANT_DATA!$G$2:$G$500,PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$5,12,31))'
  $overview.Range('B8').Formula = '=SUMIFS(PLANT_DATA!$G$2:$G$500,PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$6,12,31))'
  $overview.Range('B9').Formula = '=SUMIFS(PLANT_DATA!$G$2:$G$500,PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$7,12,31))'
  $overview.Range('C7').Formula = '=COUNTIFS(PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$5,12,31))'
  $overview.Range('C8').Formula = '=COUNTIFS(PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$6,12,31))'
  $overview.Range('C9').Formula = '=COUNTIFS(PLANT_DATA!$H$2:$H$500,">0",PLANT_DATA!$H$2:$H$500,"<="&DATE(SETTINGS!$B$7,12,31))'
  $overview.Range('D7').Formula = '=COUNTIF(CORE_MODEL!$D$2:$D$200,"Critical gap")'
  $overview.Range('D8').Formula = '=COUNTIF(CORE_MODEL!$E$2:$E$200,"Critical gap")'
  $overview.Range('D9').Formula = '=COUNTIF(CORE_MODEL!$F$2:$F$200,"Critical gap")'
  $overview.Range('E7').Value2 = 'Near-term interventions'
  $overview.Range('E8').Value2 = 'Medium-term reinforcement'
  $overview.Range('E9').Value2 = 'Long-term portfolio planning'
  $overview.Range('A12').Value2 = 'Editing workflow'
  $overview.Range('A12').Font.Bold = $true
  $overview.Range('A13').Value2 = '1. Update blue cells in PLANT_DATA. Grey proxy columns calculate automatically from Net MW and SETTINGS.'
  $overview.Range('A14').Value2 = '2. Confirm blank retirement dates in DATA_CHECKS. Blank dates are treated as active in the location model.'
  $overview.Range('A15').Value2 = '3. Review Secure, Under pressure and Critical gap labels in OUTPUTS. Raw scores are hidden in CORE_MODEL.'
  $overview.Range('A16').Value2 = '4. The current app can import PLANT_DATA, CORE_MODEL and OUTPUTS directly.'
  $overview.Range('A6:E6').Font.Bold = $true
  $overview.Range('A6:E6').Interior.Color = 15132390
  $overview.Range('B7:B9').NumberFormat = '#,##0 "MW"'
  $overview.Columns('A:H').AutoFit() | Out-Null
  $overview.Columns('A').ColumnWidth = 20
  $overview.Columns('B:D').ColumnWidth = 22
  $overview.Columns('E').ColumnWidth = 32
  $overview.Rows('13:16').RowHeight = 27
  $overview.Range('A13:A16').WrapText = $true

  Style-Title $checksSheet 'Data quality checks' 'A1:D2'
  $checksSheet.Range('A4:D4').Value2 = @('Plant name', 'Node ID', 'Issue', 'Recommended action')
  $checkRow = 5
  foreach ($plant in $plants) {
    if (-not $plant.RetirementDate) {
      $checksSheet.Cells.Item($checkRow, 1).Value2 = $plant.PlantName
      $checksSheet.Cells.Item($checkRow, 2).Value2 = $plant.NodeId
      $checksSheet.Cells.Item($checkRow, 3).Value2 = 'Retirement date not confirmed'
      $checksSheet.Cells.Item($checkRow, 4).Value2 = 'Set the best available date, or retain blank only when the asset is assumed active in every outlook.'
      $checkRow += 1
    }
    if ($plant.Confidence -lt 60) {
      $checksSheet.Cells.Item($checkRow, 1).Value2 = $plant.PlantName
      $checksSheet.Cells.Item($checkRow, 2).Value2 = $plant.NodeId
      $checksSheet.Cells.Item($checkRow, 3).Value2 = 'Low confidence evidence'
      $checksSheet.Cells.Item($checkRow, 4).Value2 = 'Review the source evidence and update the confidence score when new information is available.'
      $checkRow += 1
    }
  }
  if ($checkRow -eq 5) { $checksSheet.Cells.Item(5, 1).Value2 = 'No current data checks' }
  $checksSheet.Range("A4:D$([Math]::Max(5, $checkRow - 1))").Borders.LineStyle = 1
  $checksSheet.Range('A4:D4').Font.Bold = $true
  $checksSheet.Range('A4:D4').Interior.Color = 15132390
  $checksSheet.Columns('A:D').AutoFit() | Out-Null
  $checksSheet.Columns('A').ColumnWidth = 30
  $checksSheet.Columns('D').ColumnWidth = 65
  $checksSheet.Range("D5:D$([Math]::Max(5, $checkRow - 1))").WrapText = $true

  foreach ($sheet in @($overview, $plantSheet, $coreSheet, $outputsSheet, $settingsSheet, $checksSheet, $lookupsSheet)) {
    $sheet.Cells.Font.Name = 'Aptos'
    $sheet.Cells.Font.Size = 10
  }
  $overview.Activate() | Out-Null
  $excel.CalculateFull()
  $workbook.Save()
  $isComplete = $true
  Write-Output "Backup created: $backupPath"
  Write-Output "Workbook updated: $WorkbookPath"
}
finally {
  if ($workbook) { $workbook.Close($isComplete) }
  if ($excel) { $excel.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
}