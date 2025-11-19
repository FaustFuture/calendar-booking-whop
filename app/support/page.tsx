'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Send } from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
})

type ContactFormData = z.infer<typeof contactSchema>

export default function SupportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  async function onSubmit(data: ContactFormData) {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // In a real app, you would send this to your backend API
      // For now, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Here you would typically do:
      // const response = await fetch('/api/support/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // })
      
      setSubmitStatus('success')
      reset()
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch (error) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Support</h1>
            <p className="text-zinc-400 mt-1">Get in touch with our team</p>
          </div>
        </div>

        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                Name *
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="input w-full"
                placeholder="Your name"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="input w-full"
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-zinc-300 mb-2">
                Subject *
              </label>
              <input
                id="subject"
                type="text"
                {...register('subject')}
                className="input w-full"
                placeholder="What can we help you with?"
              />
              {errors.subject && (
                <p className="text-red-400 text-sm mt-1">{errors.subject.message}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                {...register('message')}
                rows={6}
                className="input w-full min-h-[150px] resize-y"
                placeholder="Please provide as much detail as possible..."
              />
              {errors.message && (
                <p className="text-red-400 text-sm mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Submit Status Messages */}
            {submitStatus === 'success' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-emerald-400 text-sm">
                  Thank you! Your message has been sent. We'll get back to you as soon as possible.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again later or contact us directly.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-zinc-400 text-sm">
          <p>We typically respond within 24-48 hours during business days.</p>
        </div>
      </div>
    </div>
  )
}

