export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Documentation</h1>
        <p className="text-zinc-400 mb-8">Learn how to create availability patterns and manage bookings</p>
        
        <div className="space-y-8 text-zinc-300">
          {/* Getting Started */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Getting Started</h2>
            <p className="mb-4">
              This calendar booking application allows you to manage your availability and accept bookings from members. 
              As an admin, you can create availability patterns that define when you're available, and members can book time slots with you.
            </p>
          </section>

          {/* Creating Availability Patterns */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Creating Availability Patterns</h2>
            <p className="mb-4">
              Availability patterns are reusable schedules that define when you're available for bookings. 
              You can create patterns for recurring schedules or specific date ranges.
            </p>
            
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-white">Step 1: Navigate to Availability Tab</h3>
              <p className="mb-4">
                From your dashboard, click on the <strong className="text-white">Availability</strong> tab. 
                This is where you'll manage all your availability patterns and time slots.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white">Step 2: Create a New Pattern</h3>
              <p className="mb-4">
                Click the <strong className="text-white">Add Time Slot</strong> button to create a new availability pattern. 
                You'll be presented with options to create either:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li><strong className="text-white">Recurring Pattern:</strong> A schedule that repeats weekly (e.g., "Every Monday 9am-5pm")</li>
                <li><strong className="text-white">Specific Dates:</strong> One-time availability for specific dates and times</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white">Step 3: Configure Your Pattern</h3>
              <p className="mb-4">For recurring patterns, you'll need to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Select the days of the week you're available</li>
                <li>Set your start and end times for each day</li>
                <li>Choose a date range for when this pattern is active</li>
                <li>Optionally set a buffer time between bookings</li>
              </ul>

              <p className="mb-4">For specific dates, you'll need to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Select the specific dates you're available</li>
                <li>Set the time slots for each selected date</li>
                <li>Configure any additional settings like meeting duration</li>
              </ul>
            </div>
          </section>

          {/* Managing Bookings */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Managing Bookings</h2>
            <p className="mb-4">
              Once you've created availability patterns, members can book time slots with you. 
              You can view and manage all bookings from the <strong className="text-white">Upcoming</strong> and <strong className="text-white">Past</strong> tabs.
            </p>

            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-white">Viewing Upcoming Bookings</h3>
              <p className="mb-4">
                The <strong className="text-white">Upcoming</strong> tab shows all future bookings. 
                From here you can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>View booking details including member information, time, and meeting links</li>
                <li>Reschedule bookings to different time slots</li>
                <li>Cancel bookings if needed</li>
                <li>Add meeting URLs (Google Meet, Zoom, etc.)</li>
                <li>Add internal notes for your reference</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white">Creating Manual Bookings</h3>
              <p className="mb-4">
                As an admin, you can also create bookings manually for members:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4 mb-4">
                <li>Navigate to the <strong className="text-white">Upcoming</strong> tab</li>
                <li>Click the <strong className="text-white">Create Booking</strong> button</li>
                <li>Select a member from the dropdown</li>
                <li>Fill in the booking details (title, description, meeting URL, notes)</li>
                <li>Save the booking</li>
              </ol>

              <h3 className="text-xl font-semibold mb-3 text-white">Past Bookings</h3>
              <p className="mb-4">
                The <strong className="text-white">Past</strong> tab shows all completed and cancelled bookings. 
                This is useful for reviewing your booking history and accessing recordings.
              </p>
            </div>
          </section>

          {/* Google Calendar Integration */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Google Calendar Integration</h2>
            <p className="mb-4">
              Connect your Google account to automatically create calendar events and generate Google Meet links for your bookings.
            </p>

            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-white">Connecting Google Calendar</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4 mb-4">
                <li>Navigate to <strong className="text-white">Settings → Integrations</strong></li>
                <li>Click <strong className="text-white">Connect Google Calendar</strong></li>
                <li>Authorize the application to access your Google Calendar</li>
                <li>Once connected, bookings will automatically create calendar events</li>
              </ol>

              <h3 className="text-xl font-semibold mb-3 text-white">Automatic Meeting Links</h3>
              <p className="mb-4">
                When you have Google Calendar connected, the system can automatically generate Google Meet links for new bookings. 
                These links will be included in the calendar event and visible to both you and the member.
              </p>
            </div>
          </section>

          {/* Recordings */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Managing Recordings</h2>
            <p className="mb-4">
              Upload and manage session recordings associated with your bookings. 
              Recordings can be uploaded as links or files.
            </p>

            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-white">Uploading Recordings</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4 mb-4">
                <li>Navigate to the <strong className="text-white">Recordings</strong> tab</li>
                <li>Click <strong className="text-white">Upload Recording</strong></li>
                <li>Choose to upload via link or file</li>
                <li>If uploading a link, paste the recording URL (supports YouTube, Vimeo, Google Drive, etc.)</li>
                <li>If uploading a file, select the file from your device</li>
                <li>Optionally associate the recording with a specific booking</li>
                <li>Add a title and save</li>
              </ol>

              <h3 className="text-xl font-semibold mb-3 text-white">Viewing Recordings</h3>
              <p className="mb-4">
                All recordings are listed in the <strong className="text-white">Recordings</strong> tab. 
                You can filter by booking, view embedded videos, and download recordings as needed.
              </p>
            </div>
          </section>

          {/* Role Switching (Admin Feature) */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Viewing as Member</h2>
            <p className="mb-4">
              As an admin, you can switch your view to see what members see. 
              This is helpful for testing the booking experience.
            </p>

            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6 mb-4">
              <p className="mb-4">
                Use the <strong className="text-white">Role Switcher</strong> in the top-right corner of your dashboard 
                to toggle between <strong className="text-white">Admin</strong> and <strong className="text-white">Member</strong> views.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Admin View:</strong> Full access to create patterns, manage all bookings, and upload recordings</li>
                <li><strong className="text-white">Member View:</strong> Limited to viewing available slots and managing your own bookings</li>
              </ul>
            </div>
          </section>

          {/* Best Practices */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Best Practices</h2>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6">
              <ul className="list-disc list-inside space-y-3 ml-4">
                <li>
                  <strong className="text-white">Keep patterns updated:</strong> Regularly review and update your availability patterns 
                  to reflect your current schedule
                </li>
                <li>
                  <strong className="text-white">Set buffer times:</strong> Add buffer time between bookings to avoid back-to-back meetings 
                  and give yourself time to prepare
                </li>
                <li>
                  <strong className="text-white">Use clear booking titles:</strong> When creating manual bookings, use descriptive titles 
                  that help you quickly identify the purpose of each meeting
                </li>
                <li>
                  <strong className="text-white">Add meeting links promptly:</strong> Add Google Meet or Zoom links as soon as bookings are created 
                  so members have all the information they need
                </li>
                <li>
                  <strong className="text-white">Upload recordings regularly:</strong> Keep your recordings organized by uploading them 
                  shortly after sessions complete
                </li>
                <li>
                  <strong className="text-white">Monitor upcoming bookings:</strong> Regularly check the Upcoming tab to stay on top of 
                  your schedule and prepare for upcoming meetings
                </li>
              </ul>
            </div>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Troubleshooting</h2>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-white">Google Calendar Not Connecting</h3>
              <p className="mb-4">
                If you're having trouble connecting Google Calendar:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Make sure you're logged into the correct Google account</li>
                <li>Check that you've granted all required permissions</li>
                <li>Try disconnecting and reconnecting your Google account</li>
                <li>Check the integrations page for any error messages</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white">Bookings Not Showing Available Slots</h3>
              <p className="mb-4">
                If members can't see available slots:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Verify that your availability patterns are active and within the current date range</li>
                <li>Check that you've selected the correct days and times</li>
                <li>Ensure slots haven't already been booked</li>
                <li>Make sure you're viewing in Member mode to see what they see</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white">Need More Help?</h3>
              <p>
                If you're still experiencing issues, please visit our <a href="/support" className="text-emerald-400 hover:text-emerald-300 underline">Support page</a> to contact us.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

