import 'dotenv/config'
import { createVirtualAccount } from '../src/lib/nomba'

async function main() {
  const accountRef = `sandbox-test-${Date.now()}` // 16-64 chars required
  const accountName = 'Paybook Sandbox Test' // 8-64 chars required

  console.log(`Creating virtual account — accountRef=${accountRef}`)

  const account = await createVirtualAccount({ accountRef, accountName })

  console.log('Virtual account created:')
  console.log(JSON.stringify(account, null, 2))

  if (!account.bankAccountNumber) {
    throw new Error('No bankAccountNumber in response — check the payload shape above')
  }

  console.log(`\nSUCCESS — bank account number: ${account.bankAccountNumber} (${account.bankName})`)
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.cause) {
    console.error('Cause:', err.cause)
  }
  process.exit(1)
})
