import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-gray-500 text-sm mb-6">Join Paybook to start collecting smarter</p>
      <RegisterForm />
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-green-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
