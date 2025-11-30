// Shared types for meeting services

export interface MeetingDetails {
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: string[] // Email addresses
  timezone?: string
  enableRecording?: boolean // Enable auto-recording
  alternativeHosts?: string[] // Email addresses of alternative hosts (for Zoom)
}

export interface MeetingResult {
  meetingUrl: string
  meetingId: string
  provider: 'google' | 'zoom'
  hostUrl?: string // For Zoom host join URL
  password?: string // For Zoom meeting password
  rawResponse?: unknown
}

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface TokenRefreshResult {
  access_token: string
  expires_in: number
  refresh_token?: string
}

export class MeetingServiceError extends Error {
  constructor(
    message: string,
    public provider: 'google' | 'zoom',
    public code?: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'MeetingServiceError'
  }
}
