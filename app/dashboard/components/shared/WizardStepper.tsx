'use client'

import { Check } from 'lucide-react'

interface Step {
  number: number
  label: string
}

interface WizardStepperProps {
  currentStep: number
  steps: Step[]
}

export default function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  const progress = ((currentStep) / steps.length) * 100

  return (
    <div className="mb-8">
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          return (
            <div key={step.number} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-all duration-200
                    ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                    ${isActive ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : ''}
                    ${isUpcoming ? 'bg-zinc-800 text-zinc-500 border-2 border-zinc-700' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium whitespace-nowrap
                    ${isActive ? 'text-emerald-400' : ''}
                    ${isCompleted ? 'text-zinc-300' : ''}
                    ${isUpcoming ? 'text-zinc-500' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-16 h-0.5 mx-2 mb-6 transition-all duration-300
                    ${stepNumber < currentStep ? 'bg-emerald-500' : 'bg-zinc-700'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
