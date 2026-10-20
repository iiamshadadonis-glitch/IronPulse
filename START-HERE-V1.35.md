# DropBeat Dance Studio V1.35

V1.35 is the complete replacement package based on the supplied V1.34 code. It is an additive interface and attendance correction release. Existing login, payment, subscription, D1 schema and role-portal business logic is preserved.

## Included corrections

- Added a final, dark-only Admin layer for late-rendered cards, notices, toggles, forms, tables, calendars and modal content that retained light backgrounds.
- Restored dark-mode home headings on desktop and mobile, including Dance Memberships, How It Works and Real Students / Real Dance Journeys.
- Corrected phone banner-copy contrast without applying a tint to the uploaded banner image.
- Corrected the compact Book the Class action, Welcome feature rows and Discover DropBeat placement on phones.
- Removed the oversized Session Details arrow and its expanded-state collision.
- Prevented plan artwork from stretching on the phone Offer Details screen.
- Removed the duplicate visible Your Class Details card on phones and added one-row Batch Time, Duration and Coach summary boxes before View Details.
- Made the Contact form full-width with app-sized input text on phones.
- Corrected checkout quantity and Order Summary dark contrast, plus phone field/button spacing and input text size.
- Students and Coaches attendance now reload independently and display role-appropriate metrics, calendar summaries and columns.
- Student Present and Student Absent counts open the matching roster tab.
- Calendar/List controls are hidden while Remuneration is selected.
- Added new V1.35 asset filenames, build keys, no-store HTML delivery and `X-DropBeat-Release: 1.35.0` so the release cannot be hidden by an older cached document.

## Windows deployment

1. Extract the complete ZIP into a new folder.
2. Double-click `DEPLOY-V1.35-WINDOWS.bat`.
3. Wait until all four steps report completion.
4. Open the normal website URL and refresh once.

## macOS or Linux deployment

From the extracted folder, run:

```bash
chmod +x DEPLOY-V1.35-MAC-LINUX.sh
./DEPLOY-V1.35-MAC-LINUX.sh
```

The deployment script stops safely if installation, verification, migration or deployment reports an error. It does not reset or delete the database.

