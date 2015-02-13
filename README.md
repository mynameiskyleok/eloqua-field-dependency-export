# eloqua-field-dependency-export

### Description
Simple utility for exporting a pipe-delimited CSV of all Eloqua contact fields and their dependencies. The following fields are exported for each field dependency: 

'Field Name',
'Field Internal Name',
'Field ID',
'Field Created By',
'Field Created Date',
'Field Last Modified By',
'Field Last Modified Date',
'Dependency Name',
'Dependency ID',
'Dependency Type',
'Dependency Created By',
'Dependency Created Date',
'Dependency Last Modified By',
'Dependency Last Modified Date'

### Install
From within the local directory you downloaded the source to:
'''
npm install
'''

### Use:
''' 
node eloquaFieldDependencyExport [-COMPANY] [-USERNAME] [-PASSWORD]
'''


