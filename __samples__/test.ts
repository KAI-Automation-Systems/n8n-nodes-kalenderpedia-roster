import { parseRosterFilename } from '../nodes/KalenderpediaRosterParser/filename';

// Test cases for filename parsing
const testCases = [
  {
    input: 'CustomerD-mai-2025-querformat.pdf',
    expected: {
      client: 'CustomerD',
      month: 'mai',
      year: '2025',
      date: '2025-05'
    }
  },
  {
    input: 'CustomerR-juni2025-querformat Kopie.pdf',
    expected: {
      client: 'CustomerR',
      month: 'juni',
      year: '2025',
      date: '2025-06'
    }
  },
  {
    input: 'CustomerR-mai-2025-querformat Kopie 4.pdf',
    expected: {
      client: 'CustomerR',
      month: 'mai',
      year: '2025',
      date: '2025-05'
    }
  },
  {
    input: 'CustomerD-juni-2025-querformat Kopie 2.pdf',
    expected: {
      client: 'CustomerD',
      month: 'juni',
      year: '2025',
      date: '2025-06'
    }
  }
];

console.log('Testing filename parser...\n');

for (const testCase of testCases) {
  try {
    const result = parseRosterFilename(testCase.input);
    const passed = 
      result.client === testCase.expected.client &&
      result.month === testCase.expected.month &&
      result.year === testCase.expected.year &&
      result.date === testCase.expected.date;

    console.log(`Input: ${testCase.input}`);
    console.log(`Expected: client=${testCase.expected.client}, month=${testCase.expected.month}, year=${testCase.expected.year}, date=${testCase.expected.date}`);
    console.log(`Got: client=${result.client}, month=${result.month}, year=${result.year}, date=${result.date}`);
    console.log(`InvoiceNumber: ${result.invoiceNumber}`);
    console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    console.log(`Input: ${testCase.input}`);
    console.log(`Status: ❌ ERROR - ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

console.log('Test complete.');

