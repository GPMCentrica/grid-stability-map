param(
  [string]$SourcePath,
  [string]$DestinationPath
)

$workspacePath = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $SourcePath) { $SourcePath = Join-Path $workspacePath 'UK Generation Retirement Register.xlsx' }
if (-not $DestinationPath) { $DestinationPath = Join-Path $workspacePath 'UK Generation Retirement Register - Refined.xlsx' }
if (-not (Test-Path $SourcePath)) { throw "Source workbook was not found: $SourcePath" }

$xlSrcRange = 1
$xlYes = 1
$xlValidateList = 3
$xlValidateWholeNumber = 1
$xlValidateDecimal = 2
$xlValidateDate = 4
$xlValidAlertStop = 1
$xlBetween = 1
$xlExpression = 2

function Set-Title([object]$sheet, [string]$text, [string]$range) {
  $titleRange = $sheet.Range($range)
  $titleRange.Merge()
  $titleRange.Value2 = $text
  $titleRange.Font.Name = 'Aptos Display'
  $titleRange.Font.Size = 20
  $titleRange.Font.Bold = $true
  $titleRange.Font.Color = 16777215
  $titleRange.Interior.Color = 3351551
  $titleRange.HorizontalAlignment = -4131
  $titleRange.VerticalAlignment = -4108
}

function Write-Column([object]$sheet, [int]$column, [string]$header, [string[]]$values) {
  $sheet.Cells.Item(1, $column).Value2 = $header
  for ($index = 0; $index -lt $values.Count; $index += 1) {
    $sheet.Cells.Item($index + 2, $column).Value2 = $values[$index]
  }
}

function Add-ListValidation([object]$range, [string]$formula) {
  $range.Validation.Delete()
  $range.Validation.Add($xlValidateList, $xlValidAlertStop, $xlBetween, $formula) | Out-Null
  $range.Validation.IgnoreBlank = $true
  $range.Validation.InCellDropdown = $true
}

$excel = $null
$sourceWorkbook = $null
$targetWorkbook = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false

  $sourceWorkbook = $excel.Workbooks.Open($SourcePath, $null, $true)
  $sourceSheet = $sourceWorkbook.Worksheets.Item('PLANT_DATA')
  $sourceRows = $sourceSheet.UsedRange.Rows.Count

  $plants = @()
  for ($row = 2; $row -le $sourceRows; $row += 1) {
    $plants += [PSCustomObject]@{
      AssetId = $sourceSheet.Cells.Item($row, 1).Value2
      PlantName = $sourceSheet.Cells.Item($row, 2).Value2
      NodeId = $sourceSheet.Cells.Item($row, 3).Value2
      NodeName = $sourceSheet.Cells.Item($row, 4).Value2
      Region = $sourceSheet.Cells.Item($row, 5).Value2
      Technology = $sourceSheet.Cells.Item($row, 6).Value2
      NetMw = $sourceSheet.Cells.Item($row, 7).Value2
      RetirementDate = $sourceSheet.Cells.Item($row, 8).Value2
      RetirementClass = $sourceSheet.Cells.Item($row, 9).Value2
      Confidence = $sourceSheet.Cells.Item($row, 10).Value2
      EvidenceFlag = $sourceSheet.Cells.Item($row, 14).Value2
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

  if (Test-Path $DestinationPath) { Remove-Item $DestinationPath -Force }
  $targetWorkbook = $excel.Workbooks.Add()
  $overview = $targetWorkbook.Worksheets.Item(1)
  $overview.Name = 'OVERVIEW'
  $plantSheet = $targetWorkbook.Worksheets.Add()
  $plantSheet.Name = 'PLANT_REGISTER'
  $nodeSheet = $targetWorkbook.Worksheets.Add()
  $nodeSheet.Name = 'NODE_RISK'
  $settingsSheet = $targetWorkbook.Worksheets.Add()
  $settingsSheet.Name = 'SETTINGS'
  $checksSheet = $targetWorkbook.Worksheets.Add()
  $checksSheet.Name = 'DATA_CHECKS'
  $lookupsSheet = $targetWorkbook.Worksheets.Add()
  $lookupsSheet.Name = 'LOOKUPS'

  Set-Title $overview 'UK Generation Retirement Register' 'A1:H2'
  $overview.Range('A4').Value2 = 'Simple, editable retirement register and location risk model'
  $overview.Range('A4').Font.Bold = $true
  $overview.Range('A6:E6').Value2 = @('Outlook year', 'Capacity retiring by year', 'Assets retiring by year', 'Critical locations', 'Planning focus')
  $overview.Range('A7').Value2 = 2030
  $overview.Range('A8').Value2 = 2040
  $overview.Range('A9').Value2 = 2050
  $overview.Range('E7').Value2 = 'Near-term interventions'
  $overview.Range('E8').Value2 = 'Medium-term reinforcement'
  $overview.Range('E9').Value2 = 'Long-term portfolio planning'
  $overview.Range('A12').Value2 = 'Editing workflow'
  $overview.Range('A12').Font.Bold = $true
  $overview.Range('A13').Value2 = '1. Update plant details in PLANT_REGISTER. Blue columns are inputs; grey proxy columns calculate from Net MW and SETTINGS.'
  $overview.Range('A14').Value2 = '2. Confirm blank retirement dates in DATA_CHECKS. Blank dates are treated as active in the location model.'
  $overview.Range('A15').Value2 = '3. Review location outlooks in NODE_RISK. Secure, Under pressure and Critical gap use the editable SETTINGS thresholds.'
  $overview.Range('A16').Value2 = '4. Use the refined workbook as the controlled source for the interactive map import.'
  $overview.Range('A6:E6').Font.Bold = $true
  $overview.Range('A6:E6').Interior.Color = 15132390
  $overview.Range('B7:B9').NumberFormat = '#,##0 "MW"'
  $overview.Columns('A:H').AutoFit() | Out-Null
  $overview.Columns('A').ColumnWidth = 19
  $overview.Columns('B:D').ColumnWidth = 22
  $overview.Columns('E').ColumnWidth = 31
  $overview.Rows('13:16').RowHeight = 27
  $overview.Range('A13:A16').WrapText = $true

  $settingsSheet.Range('A1:C1').Merge()
  Set-Title $settingsSheet 'Model settings' 'A1:C2'
  $settingsSheet.Range('A4:C4').Value2 = @('Parameter', 'Editable value', 'Purpose')
  $settings = @(
    @('Baseline year', 2026, 'Reference year for retirement assumptions'),
    @('Near-term horizon', 2030, 'First planning horizon'),
    @('Mid-term horizon', 2040, 'Second planning horizon'),
    @('Long-term horizon', 2050, 'Third planning horizon'),
    @('', '', ''),
    @('Inertia weight', 0.4, 'Composite risk weighting'),
    @('Fault weight', 0.4, 'Composite risk weighting'),
    @('Reactive weight', 0.2, 'Composite risk weighting'),
    @('', '', ''),
    @('Critical gap threshold', 0.7, 'Model score at or above this is Critical gap'),
    @('Under pressure threshold', 0.25, 'Model score at or above this is Under pressure'),
    @('Low confidence threshold', 60, 'Score below this needs data review'),
    @('', '', ''),
    @('Inertia factor per MW', 5, 'Proxy multiplier for inertia'),
    @('Fault factor per MW', 1.1, 'Proxy multiplier for fault level'),
    @('Reactive factor per MW', 0.33, 'Proxy multiplier for reactive capability')
  )
  for ($index = 0; $index -lt $settings.Count; $index += 1) {
    $settingsSheet.Cells.Item($index + 5, 1).Value2 = $settings[$index][0]
    $settingsSheet.Cells.Item($index + 5, 2).Value2 = $settings[$index][1]
    $settingsSheet.Cells.Item($index + 5, 3).Value2 = $settings[$index][2]
  }
  $settingsSheet.Range('A4:C4').Font.Bold = $true
  $settingsSheet.Range('A4:C4').Interior.Color = 15132390
  $settingsSheet.Range('B5:B20').Interior.Color = 15724527
  $settingsSheet.Range('B9:B11').NumberFormat = '0.0'
  $settingsSheet.Range('B13:B14').NumberFormat = '0.00'
  $settingsSheet.Columns('A:C').AutoFit() | Out-Null
  $settingsSheet.Columns('A').ColumnWidth = 29
  $settingsSheet.Columns('C').ColumnWidth = 42

  $plantHeaders = @('Asset ID', 'Plant name', 'Node ID', 'Node / substation', 'Region', 'Technology', 'Net MW', 'Retirement date', 'Retirement class', 'Confidence score', 'Inertia proxy', 'Fault proxy', 'Reactive proxy', 'Evidence flag', 'Analyst notes')
  for ($column = 0; $column -lt $plantHeaders.Count; $column += 1) { $plantSheet.Cells.Item(1, $column + 1).Value2 = $plantHeaders[$column] }
  for ($index = 0; $index -lt $plants.Count; $index += 1) {
    $plant = $plants[$index]
    $row = $index + 2
    $plantSheet.Cells.Item($row, 1).Value2 = $plant.AssetId
    $plantSheet.Cells.Item($row, 2).Value2 = $plant.PlantName
    $plantSheet.Cells.Item($row, 3).Value2 = $plant.NodeId
    $plantSheet.Cells.Item($row, 4).Value2 = $plant.NodeName
    $plantSheet.Cells.Item($row, 5).Value2 = $plant.Region
    $plantSheet.Cells.Item($row, 6).Value2 = $plant.Technology
    $plantSheet.Cells.Item($row, 7).Value2 = $plant.NetMw
    $plantSheet.Cells.Item($row, 8).Value2 = $plant.RetirementDate
    $plantSheet.Cells.Item($row, 9).Value2 = $plant.RetirementClass
    $plantSheet.Cells.Item($row, 10).Value2 = $plant.Confidence
    $plantSheet.Cells.Item($row, 14).Value2 = $plant.EvidenceFlag
  }
  $plantRange = $plantSheet.Range("A1:O$($plants.Count + 1)")
  $plantTable = $plantSheet.ListObjects.Add($xlSrcRange, $plantRange, $null, $xlYes)
  $plantTable.Name = 'PlantRegister'
  $plantTable.TableStyle = 'TableStyleMedium2'
  $plantTable.ListColumns.Item('Inertia proxy').DataBodyRange.Formula = '=[@[Net MW]]*Settings!$B$19'
  $plantTable.ListColumns.Item('Fault proxy').DataBodyRange.Formula = '=[@[Net MW]]*Settings!$B$20'
  $plantTable.ListColumns.Item('Reactive proxy').DataBodyRange.Formula = '=[@[Net MW]]*Settings!$B$21'
  $plantSheet.Range("A2:J$($plants.Count + 1)").Interior.Color = 15724527
  $plantSheet.Range("N2:O$($plants.Count + 1)").Interior.Color = 15724527
  $plantSheet.Range("K2:M$($plants.Count + 1)").Interior.Color = 15132390
  $plantSheet.Range("G2:G$($plants.Count + 1)").NumberFormat = '#,##0'
  $plantSheet.Range("H2:H$($plants.Count + 1)").NumberFormat = 'dd/mm/yyyy'
  $plantSheet.Range("J2:J$($plants.Count + 1)").NumberFormat = '0'
  $plantSheet.Range("K2:M$($plants.Count + 1)").NumberFormat = '#,##0.0'
  $plantSheet.Columns('A:O').AutoFit() | Out-Null
  $plantSheet.Columns('B').ColumnWidth = 30
  $plantSheet.Columns('D').ColumnWidth = 23
  $plantSheet.Columns('F').ColumnWidth = 28
  $plantSheet.Columns('O').ColumnWidth = 34
  $plantSheet.Range("A1:O$($plants.Count + 1)").VerticalAlignment = -4108

  Write-Column $lookupsSheet 1 'Regions' $regions
  Write-Column $lookupsSheet 2 'Technologies' $technologies
  Write-Column $lookupsSheet 3 'Retirement classes' $retirementClasses
  Write-Column $lookupsSheet 4 'Evidence flags' $evidenceFlags
  $lookupsSheet.Range('A1:D1').Font.Bold = $true
  $lookupsSheet.Range('A1:D1').Interior.Color = 15132390
  $lookupsSheet.Columns('A:D').AutoFit() | Out-Null
  $targetWorkbook.Names.Add('RegionList', "=LOOKUPS!`$A`$2:`$A`$$($regions.Count + 1)") | Out-Null
  $targetWorkbook.Names.Add('TechnologyList', "=LOOKUPS!`$B`$2:`$B`$$($technologies.Count + 1)") | Out-Null
  $targetWorkbook.Names.Add('RetirementClassList', "=LOOKUPS!`$C`$2:`$C`$$($retirementClasses.Count + 1)") | Out-Null
  if ($evidenceFlags.Count -gt 0) { $targetWorkbook.Names.Add('EvidenceFlagList', "=LOOKUPS!`$D`$2:`$D`$$($evidenceFlags.Count + 1)") | Out-Null }
  Add-ListValidation $plantTable.ListColumns.Item('Region').DataBodyRange '=RegionList'
  Add-ListValidation $plantTable.ListColumns.Item('Technology').DataBodyRange '=TechnologyList'
  Add-ListValidation $plantTable.ListColumns.Item('Retirement class').DataBodyRange '=RetirementClassList'
  if ($evidenceFlags.Count -gt 0) { Add-ListValidation $plantTable.ListColumns.Item('Evidence flag').DataBodyRange '=EvidenceFlagList' }
  $plantTable.ListColumns.Item('Retirement date').DataBodyRange.Validation.Add($xlValidateDate, $xlValidAlertStop, $xlBetween, '1/1/2000', '31/12/2100') | Out-Null
  $plantTable.ListColumns.Item('Net MW').DataBodyRange.Validation.Add($xlValidateDecimal, $xlValidAlertStop, 7, 0) | Out-Null
  $plantTable.ListColumns.Item('Confidence score').DataBodyRange.Validation.Add($xlValidateWholeNumber, $xlValidAlertStop, $xlBetween, 0, 100) | Out-Null

  $nodeHeaders = @('Node ID', 'Node / substation', 'Region', '2030 outlook', '2040 outlook', '2050 outlook', 'Timing', 'Lowest confidence', 'Total MW', 'Plant count', 'Model score 2030', 'Model score 2040', 'Model score 2050')
  for ($column = 0; $column -lt $nodeHeaders.Count; $column += 1) { $nodeSheet.Cells.Item(1, $column + 1).Value2 = $nodeHeaders[$column] }
  for ($index = 0; $index -lt $nodes.Count; $index += 1) {
    $row = $index + 2
    $nodeSheet.Cells.Item($row, 1).Value2 = $nodes[$index].NodeId
    $nodeSheet.Cells.Item($row, 2).Value2 = $nodes[$index].NodeName
    $nodeSheet.Cells.Item($row, 3).Value2 = $nodes[$index].Region
  }
  $nodeRange = $nodeSheet.Range("A1:M$($nodes.Count + 1)")
  $nodeTable = $nodeSheet.ListObjects.Add($xlSrcRange, $nodeRange, $null, $xlYes)
  $nodeTable.Name = 'NodeRisk'
  $nodeTable.TableStyle = 'TableStyleMedium9'
  $scoreFormula = {
    param([int]$horizonRow)
    @'
=IFERROR(Settings!$B$9*(1-SUMPRODUCT((PlantRegister[Node ID]=[@[Node ID]])*((PlantRegister[Retirement date]="")+(PlantRegister[Retirement date]>DATE(Settings!$B${0},12,31)))*PlantRegister[Inertia proxy])/SUMIFS(PlantRegister[Inertia proxy],PlantRegister[Node ID],[@[Node ID]]))+Settings!$B$10*(1-SUMPRODUCT((PlantRegister[Node ID]=[@[Node ID]])*((PlantRegister[Retirement date]="")+(PlantRegister[Retirement date]>DATE(Settings!$B${0},12,31)))*PlantRegister[Fault proxy])/SUMIFS(PlantRegister[Fault proxy],PlantRegister[Node ID],[@[Node ID]]))+Settings!$B$11*(1-SUMPRODUCT((PlantRegister[Node ID]=[@[Node ID]])*((PlantRegister[Retirement date]="")+(PlantRegister[Retirement date]>DATE(Settings!$B${0},12,31)))*PlantRegister[Reactive proxy])/SUMIFS(PlantRegister[Reactive proxy],PlantRegister[Node ID],[@[Node ID]])),0)
'@ -f $horizonRow
  }
  $nodeTable.ListColumns.Item('Model score 2030').DataBodyRange.Formula = & $scoreFormula 5
  $nodeTable.ListColumns.Item('Model score 2040').DataBodyRange.Formula = & $scoreFormula 6
  $nodeTable.ListColumns.Item('Model score 2050').DataBodyRange.Formula = & $scoreFormula 7
  $nodeTable.ListColumns.Item('2030 outlook').DataBodyRange.Formula = '=IF([@[Model score 2030]]>=Settings!$B$13,"Critical gap",IF([@[Model score 2030]]>=Settings!$B$14,"Under pressure","Secure"))'
  $nodeTable.ListColumns.Item('2040 outlook').DataBodyRange.Formula = '=IF([@[Model score 2040]]>=Settings!$B$13,"Critical gap",IF([@[Model score 2040]]>=Settings!$B$14,"Under pressure","Secure"))'
  $nodeTable.ListColumns.Item('2050 outlook').DataBodyRange.Formula = '=IF([@[Model score 2050]]>=Settings!$B$13,"Critical gap",IF([@[Model score 2050]]>=Settings!$B$14,"Under pressure","Secure"))'
  $nodeTable.ListColumns.Item('Timing').DataBodyRange.Formula = '=IF([@[Model score 2030]]>=Settings!$B$13,"Near-term",IF([@[Model score 2040]]>=Settings!$B$13,"Mid-term",IF([@[Model score 2050]]>=Settings!$B$13,"Long-term","No critical gap")))'
  $nodeTable.ListColumns.Item('Lowest confidence').DataBodyRange.Formula = '=IFERROR(MINIFS(PlantRegister[Confidence score],PlantRegister[Node ID],[@[Node ID]]),"")'
  $nodeTable.ListColumns.Item('Total MW').DataBodyRange.Formula = '=SUMIFS(PlantRegister[Net MW],PlantRegister[Node ID],[@[Node ID]])'
  $nodeTable.ListColumns.Item('Plant count').DataBodyRange.Formula = '=COUNTIF(PlantRegister[Node ID],[@[Node ID]])'
  $nodeSheet.Range("H2:H$($nodes.Count + 1)").NumberFormat = '0'
  $nodeSheet.Range("I2:I$($nodes.Count + 1)").NumberFormat = '#,##0 "MW"'
  $nodeSheet.Range("K2:M$($nodes.Count + 1)").NumberFormat = '0.00'
  $nodeSheet.Columns('A:M').AutoFit() | Out-Null
  $nodeSheet.Columns('B').ColumnWidth = 25
  $nodeSheet.Columns('D:F').ColumnWidth = 17
  $nodeSheet.Columns('K:M').Hidden = $true
  $nodeSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Critical gap"').Interior.Color = 13421823
  $nodeSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Under pressure"').Interior.Color = 10092543
  $nodeSheet.Range("D2:F$($nodes.Count + 1)").FormatConditions.Add($xlExpression, $null, '=D2="Secure"').Interior.Color = 13434828

  Set-Title $checksSheet 'Data quality checks' 'A1:D2'
  $checksSheet.Range('A4:D4').Value2 = @('Plant name', 'Node ID', 'Issue', 'Recommended action')
  $checkRow = 5
  foreach ($plant in $plants | Where-Object { -not $_.RetirementDate }) {
    $checksSheet.Cells.Item($checkRow, 1).Value2 = $plant.PlantName
    $checksSheet.Cells.Item($checkRow, 2).Value2 = $plant.NodeId
    $checksSheet.Cells.Item($checkRow, 3).Value2 = 'Retirement date not confirmed'
    $checksSheet.Cells.Item($checkRow, 4).Value2 = 'Set the best available retirement date. Leave blank only if the asset should remain active in every outlook.'
    $checkRow += 1
  }
  $checksSheet.Range("A4:D$($checkRow - 1)").Borders.LineStyle = 1
  $checksSheet.Range('A4:D4').Font.Bold = $true
  $checksSheet.Range('A4:D4').Interior.Color = 15132390
  $checksSheet.Columns('A:D').AutoFit() | Out-Null
  $checksSheet.Columns('A').ColumnWidth = 30
  $checksSheet.Columns('D').ColumnWidth = 65
  $checksSheet.Range("D5:D$($checkRow - 1)").WrapText = $true

  $overview.Range('B7').Formula = '=SUMIFS(PlantRegister[Net MW],PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$5,12,31))'
  $overview.Range('B8').Formula = '=SUMIFS(PlantRegister[Net MW],PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$6,12,31))'
  $overview.Range('B9').Formula = '=SUMIFS(PlantRegister[Net MW],PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$7,12,31))'
  $overview.Range('C7').Formula = '=COUNTIFS(PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$5,12,31))'
  $overview.Range('C8').Formula = '=COUNTIFS(PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$6,12,31))'
  $overview.Range('C9').Formula = '=COUNTIFS(PlantRegister[Retirement date],">0",PlantRegister[Retirement date],"<="&DATE(Settings!$B$7,12,31))'
  $overview.Range('D7').Formula = '=COUNTIF(NodeRisk[2030 outlook],"Critical gap")'
  $overview.Range('D8').Formula = '=COUNTIF(NodeRisk[2040 outlook],"Critical gap")'
  $overview.Range('D9').Formula = '=COUNTIF(NodeRisk[2050 outlook],"Critical gap")'

  foreach ($sheet in @($overview, $plantSheet, $nodeSheet, $settingsSheet, $checksSheet, $lookupsSheet)) {
    $sheet.Cells.Font.Name = 'Aptos'
    $sheet.Cells.Font.Size = 10
    $sheet.Activate() | Out-Null
    $excel.ActiveWindow.SplitRow = 1
    $excel.ActiveWindow.FreezePanes = $true
  }
  $overview.Activate() | Out-Null
  $targetWorkbook.Worksheets.Item('PLANT_REGISTER').Activate() | Out-Null
  $targetWorkbook.Worksheets.Item('OVERVIEW').Activate() | Out-Null
  $excel.CalculateFullRebuild()
  $targetWorkbook.SaveAs($DestinationPath, 51)
  Write-Output "Created refined workbook: $DestinationPath"
}
finally {
  if ($targetWorkbook) { $targetWorkbook.Close($true) }
  if ($sourceWorkbook) { $sourceWorkbook.Close($false) }
  if ($excel) { $excel.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
}