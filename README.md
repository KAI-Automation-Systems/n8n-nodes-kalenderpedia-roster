# n8n-nodes-kalenderpedia-roster

Custom n8n node for parsing Kalenderpedia roster PDFs and extracting workday schedules.

## Overview

This custom n8n node processes German PDF roster files from Kalenderpedia, parsing filenames for date information and extracting scheduled workdays from the PDF content. The node is designed for automation workflows that need to convert PDF rosters into structured calendar data.

## Features

- **PDF Binary Input**: Accepts PDF files as binary data from n8n workflows
- **German Month Parsing**: Handles German month names (januar, februar, märz/maerz, etc.)
- **Filename Pattern Recognition**: Parses client names, months, and years from filenames
- **Flexible Filename Formats**: Supports various filename patterns including:
  - Spaces, dots, or dashes as separators
  - Suffixes like "querformat", "kopie", "kopie [number]"
  - Mixed formatting inconsistencies
- **Robust Error Handling**: Clear error messages and validation
- **Timezone Aware**: Configured for Europe/Vienna timezone

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/KAI-Automation-Systems/n8n-nodes-kalenderpedia-roster.git
cd n8n-nodes-kalenderpedia-roster

# Install dependencies
npm install

# Build the node
npm run build
```

### Link to n8n

```bash
# Link the package globally
npm link

# In your n8n installation directory
npm link n8n-nodes-kalenderpedia-roster
```

Restart n8n, and the "Kalenderpedia Roster Parser" node will be available in the node palette.

## Usage

### In n8n Workflow

1. Add the **Kalenderpedia Roster Parser** node to your workflow
2. Connect a node that provides PDF binary data (e.g., Read Binary File, Email Trigger with attachment)
3. Configure the optional filename override if needed
4. The node outputs structured JSON with extracted workday information

### Input

The node expects a binary PDF file with a filename in one of these formats:
- `CustomerD-mai-2025-querformat.pdf`
- `CustomerD-mai-2025.pdf`
- `CustomerD-juni-2025-querformat Kopie.pdf`
- `CustomerD-juni-2025-querformat Kopie 2.pdf`

### Output

```json
{
  "client": "CustomerD",
  "month": "mai",
  "year": "2025",
  "date": "2025-05",
  "invoiceNumber": "CustomerD-mai-2025-querformat",
  "days": [5, 12, 17, 24]
}
```

The `days` array contains all day numbers where the target text appears in the PDF roster.

## Example Workflow

```
[Read Binary File] → [Kalenderpedia Roster Parser] → [Function Node] → [Google Calendar]
```

1. **Read Binary File**: Loads the PDF roster
2. **Kalenderpedia Roster Parser**: Extracts client name, dates, and workdays
3. **Function Node**: Transforms data into calendar event format
4. **Google Calendar**: Creates calendar entries for each workday

## Node Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| File Name Override | string | No | Optional filename if binary filename is missing |

## Development

### Project Structure

```
n8n-nodes-kalenderpedia-roster/
├── index.ts                              # Main entry point
├── nodes/
│   └── KalenderpediaRosterParser/
│       ├── KalenderpediaRosterParser.node.ts  # Node implementation
│       ├── filename.ts                        # Filename parsing logic
│       ├── pdf.ts                             # PDF extraction logic
│       └── months.ts                          # German month mappings
├── __samples__/
│   └── test.ts                           # Test cases
├── package.json
└── tsconfig.json
```

### Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run linter (currently skipped)
npm run lint
```

### Testing

The `__samples__/test.ts` file contains test cases for filename parsing:

```bash
npx ts-node __samples__/test.ts
```

## Dependencies

- **pdf-parse** (^1.1.1): PDF text extraction
- **pdfjs-dist** (^3.11.174): Mozilla's PDF.js library
- **iconv-lite** (^0.6.3): Character encoding conversion
- **dayjs** (^1.11.10): Date manipulation
- **n8n-workflow** (^1.0.0): n8n workflow types

## Supported German Months

| German | Month Number |
|--------|-------------|
| januar | 01 |
| februar | 02 |
| märz / maerz | 03 |
| april | 04 |
| mai | 05 |
| juni | 06 |
| juli | 07 |
| august | 08 |
| september | 09 |
| oktober | 10 |
| november | 11 |
| dezember / dez | 12 |

## Error Handling

The node provides clear error messages for common issues:
- Missing or invalid filename
- Empty binary data
- Unparseable filename format
- PDF parsing failures

## Timezone

The node is configured for **Europe/Vienna** timezone. Adjust the timezone in your workflow if needed.

## License

MIT

## Author

**Kevin Mast** - KAI Automation Systems

- Email: kevinmast.km@gmail.com
- GitHub: [@KAI-Automation-Systems](https://github.com/KAI-Automation-Systems)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Note**: This node is designed for specific Kalenderpedia PDF roster formats. Ensure your PDFs follow the expected table structure for reliable parsing.
