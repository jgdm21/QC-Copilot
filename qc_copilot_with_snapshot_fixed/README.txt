# QC Copilot Extension – Floating Panel

## Main Files

- **`background.js`**: Service worker that handles data validation logic, compares with external lists (Google Sheets) and manages asynchronous Zendesk search.
- **`content.js`**: Script injected into the Sonosuite page to extract release data and communicate with `background.js`.
- **`drawer.html`**, **`drawer.js`**, **`drawer.css`**: Files that compose the floating panel (sidebar) user interface that displays validation results.
- **`drawer_blank.html`**: Simplified panel version for when the extension is in "list" mode (revisions table).
- **`drawer_injector.js`**: Script that injects the floating panel iframe into the Sonosuite interface.
- **`manifest.json`**: Defines extension permissions, content scripts, service worker and URLs it can access.

Notes: The Spotify dataset is loaded from `https://jgdm21.github.io/spotify-top-json/spotify_top_tracks.json` with prefetch and timeout to avoid blocking the render.

---

## Complete List of Validations (QC Checks)

### 🔴 **Critical Validations (Red)**

#### **User/Usuario**
1. **User Has Strikes** - User has strikes on their profile (F1, F2, etc.)
2. **User Has Zendesk Tickets** - User has open or historical tickets in Zendesk (includes fraud-related)
3. **Match with Blacklisted Email** - User email matches blacklist
4. **Match with Blacklisted Artist** - Artist matches blacklist of fraudulent artists
5. **Match with Blacklisted Label** - Label matches blacklist of sensitive labels
6. **User Not Verified** - User is not completely verified

#### **Content/Contenido**
7. **Release Previously Rejected** - Release that was previously rejected
8. **No Tracks Found** - No audio tracks detected in the release
9. **Track Duration 00:00:00** - Player shows 00:00:00, indicating missing or unloaded audio; check the track status in the core platform.
10. **Potential Mashup Detected** - Presence of "x" in titles (common in mashups)
11. **Track Duration ≥20min** - Track with unusually long duration (≥20 minutes)
12. **Track Duration ≤30s** - Track with unusually short duration (≤30 seconds)
13. **Explicit Content Detected** - Explicit content detected

#### **Audio Analysis**
14. **Score 100%** - Score of 100% (perfect audio match)
15. **Audio Title Very Similar** - Audio title very similar (80%+ similarity)
16. **Audio Title Moderately Similar** - Audio title moderately similar (60-79% similarity)
17. **Audio Title Different** - Audio title completely different
18. **Audio Artist Very Similar** - Audio artist very similar (80%+ similarity)
19. **Audio Artist Moderately Similar** - Audio artist moderately similar (60-79% similarity)
20. **Audio Artists Different** - Audio artists completely different
21. **Audio Additional Artists** - Additional artists detected in audio

### 🟡 **Warning Validations (Yellow)**

#### **Content/Contenido**
22. **Match with Curated Artist** - Artist appears in curated list (possible unauthorized use)
23. **Match with Suspicious Term** - Release contains suspicious terms (e.g., "free beats", "type beat")
24. **Language at Release** - Release in high-risk language (Turkish, Vietnamese)
25. **Language in Track** - Track in high-risk language (Turkish, Vietnamese)
26. **Version Tag Detected** - Release marked with version tag (remastered, live, explicit)
27. **Track Version Tag Detected** - Track marked with version tag
28. **Tracks Between 1:00 and 1:59** - Pattern of short tracks (≥80% between 1:00-1:59)
29. **Tracks in Alphabetical Order** - Tracks ordered alphabetically (unusual pattern)
30. **Release Title Matches Top Song** - Release title matches popular Spotify song
31. **Track Matches Top Song** - Track title matches popular Spotify song

#### **User/Usuario**
32. **Suspicious Email Domain Detected** - Email uses suspicious domain (ProtonMail, Tutanota, etc.)

#### **Audio Analysis**
33. **Audio Matches Found** - Audio matches detected with existing content
34. **Audio Matches in Tracks** - Audio matches in specific tracks
35. **Audio Analysis Consolidated** - Consolidated audio analysis results
36. **Similar Title** - Similar title detected
37. **Similar Title but Different Artist** - Similar title but different artist
38. **Similar Artist** - Similar artist name detected
39. **Title Matches Curated Artist** - Title matches curated artist
40. **Artist Matches Curated Artist** - Artist matches curated artist

### 📊 **Tenant Information**
41. **Tenant Considerations** - Tenant-specific considerations (from Google Sheets)
42. **Tenant Fraud Points** - Tenant fraud points and ranking position

### 🔄 **System Status Validations**
43. **Zendesk Tickets: Searching** - Zendesk ticket search in progress
44. **Audio Analysis: In Progress** - Audio analysis in progress
45. **Audio Analysis: Disabled** - Audio analysis disabled
46. **Important Modals Open** - Important modals open (blocks audio analysis)
47. **Composer Name Format** - Composer entries must include at least first + last name; separate multiple names with commas
48. **Lyricist Name Format** - Lyricist entries must include at least first + last name; separate multiple names with commas

---

## Test Release Conditions to Validate All Tool Features

### **Release #1: "Critical Issues Release" (Test Red Validations)**
**Required Conditions:**
- User has F1 or F2 strikes on their profile
- User email matches blacklisted email domain (e.g., @protonmail.com)
- Release was previously rejected (check history modal)
- Contains at least one track ≥20 minutes
- Contains at least one track ≤30 seconds
- At least one track shows 00:00:00 duration in the player
- Release title contains "x" (mashup pattern)
- User has open Zendesk tickets (including fraud-related)

**Expected Validations:**
- User Has Strikes (Red)
- Match with Blacklisted Email (Red)
- Release Previously Rejected (Red)
- Track Duration ≥20min (Red)
- Track Duration ≤30s (Red)
- Track Duration 00:00:00 (Red)
- Potential Mashup Detected (Red)
- User Has Zendesk Tickets (Red)

### **Release #2: "Suspicious Content Release" (Test Yellow Validations)**
**Required Conditions:**
- User is not fully verified
- Artist name matches curated artists list
- Release title contains suspicious terms ("free beats", "type beat")
- Contains explicit content (explicit tag)
- Release title matches popular Spotify song
- At least 80% of tracks are between 1:00-1:59 duration
- Tracks are in alphabetical order
- Contains version tags (remastered, live, explicit)
- Release or tracks in Turkish/Vietnamese language

**Expected Validations:**
- User Not Verified (Yellow)
- Match with Curated Artist (Yellow)
- Match with Suspicious Term (Yellow)
- Explicit Content Detected (Yellow)
- Release Title Matches Top Song (Yellow)
- Tracks Between 1:00 and 1:59 (Yellow)
- Tracks in Alphabetical Order (Yellow)
- Version Tag Detected (Yellow)
- Language at Release/Track (Yellow)

### **Release #3: "Audio Analysis Release" (Test Technical Features)**
**Required Conditions:**
- Multiple tracks with audio analysis results
- Tracks with different scores and alerts
- Mix of fragment types (high similarity, medium similarity, low similarity)
- Tracks with different durations and metadata
- Various artist and album information

**Expected Validations:**
- Audio Analysis Modal Access
- Track Data Extraction
- Fragment Analysis
- Score and Alert Display
- Data Communication between components
- Audio Title Very Similar (Yellow)
- Audio Title Moderately Similar (Yellow)
- Audio Title Different (Yellow)
- Audio Artist Very Similar (Yellow)
- Audio Artist Moderately Similar (Yellow)
- Audio Artists Different (Yellow)
- Audio Additional Artists (Yellow)
- Score 100% (Red)

### **Release #4: "Tenant Information Release" (Test Tenant Features)**
**Required Conditions:**
- Release from tenant with considerations in Google Sheets
- Tenant with fraud points in the system
- Various tenant metadata

**Expected Validations:**
- Tenant Considerations (Yellow)
- Tenant Fraud Points (Yellow)

### **Release #5: "System Status Release" (Test System Features)**
**Required Conditions:**
- Release with audio analysis enabled/disabled
- Modals open during analysis
- Zendesk search in progress

**Expected Validations:**
- Audio Analysis: In Progress (Yellow)
- Audio Analysis: Disabled (Yellow)
- Important Modals Open (Yellow)
- Zendesk Tickets: Searching (Yellow)

### **Release #6: "Clean Release" (Test System Stability)**
**Required Conditions:**
- User with no strikes
- Verified user
- No blacklisted content
- Normal track durations
- No suspicious patterns
- Standard metadata

**Expected Validations:**
- No critical validations triggered
- System loads correctly
- All components communicate properly
- Performance metrics within acceptable ranges

### **Release #7: "Edge Case Release" (Test Error Handling)**
**Required Conditions:**
- Very long release title
- Special characters in metadata
- Unusual track structures
- Missing or incomplete data
- Network connectivity issues (simulate)

**Expected Validations:**
- Error handling for invalid data
- Fallback mechanisms
- Graceful degradation
- User-friendly error messages

---

## Dependencies and Required Maintenance

### 🔗 **Critical External Dependencies**

#### **1. Google Sheets (References)**
- **Location**: `background.js` - Constant `SHEET_URLS`
- **Dependencies**:
  - `blacklistEmails` - Blacklist of fraudulent emails
  - `blacklistArtists` - Blacklist of fraudulent artists
  - `blacklistLabels` - Blacklist of sensitive labels
  - `curatedArtists` - Curated list of artists (possible unauthorized use)
  - `terms` - Suspicious terms
  - `tenantConsiderations` - Considerations by tenant
  - `tenantFraudPoints` - Fraud points by tenant

**⚠️ REQUIRED MAINTENANCE**: If you lose access to these sheets, you'll need to:
- Create new Google Sheets with the same structure
- Update URLs in `background.js`
- Configure public access permissions for CSV export

#### **2. Spotify Dataset**
- **Location**: `drawer.js` - Constant `SPOTIFY_TRACKS_URL`
- **Current URL**: `https://jgdm21.github.io/spotify-top-json/spotify_top_tracks.json`
- **Purpose**: Compare release/track titles with popular Spotify songs

**⚠️ REQUIRED MAINTENANCE**: This dataset is personal and hosted on GitHub Pages. If you lose access:
- You'll need to create your own popular Spotify songs dataset
- Update the URL in `drawer.js`
- Implement an automatic dataset update system

#### **3. Zendesk API Proxy**
- **Location**: `background.js` - Constant `ZENDESK_API_PROXY_URL`
- **Current URL**: `https://script.google.com/macros/s/AKfycbxhT1vfIu7BiWLJIQkMr4WzYtajfjakYHhcNkw1u7DSWHNcljvIFTMmYTnHoL5Q8Q-b/exec`
- **Purpose**: Search Zendesk tickets by user email

**⚠️ REQUIRED MAINTENANCE**: This is a personal Google Apps Script. If you lose access:
- You'll need to create your own Google Apps Script
- Configure Zendesk API integration
- Update the URL in `background.js`

#### **4. CORS Proxies**
- **Locations**: `background.js` - Function `fetchCSV()`
- **Current Proxies**:
  - `https://api.allorigins.win/raw?url=`
  - `https://corsproxy.io/?`
- **Purpose**: Avoid CORS restrictions when accessing Google Sheets

**⚠️ REQUIRED MAINTENANCE**: These services may change or disappear:
- Monitor proxy availability
- Have alternatives ready (new proxies or implementation changes)

### 🔧 **Technical Dependencies**

#### **5. Sonosuite CSS Selectors**
- **Location**: `content.js` and `drawer_injector.js`
- **Purpose**: Extract data from Sonosuite interface

**⚠️ REQUIRED MAINTENANCE**: If Sonosuite updates their interface:
- Review and update all CSS selectors
- Test data extraction after updates

#### **6. Chrome Extension Permissions**
- **Location**: `manifest.json`
- **Required Hosts**:
  - `https://backoffice.sonosuite.com/*`
  - `https://docs.google.com/*`
  - `https://*.googleapis.com/*`
  - `https://api.allorigins.win/*`
  - `https://corsproxy.io/*`
  - `https://jgdm21.github.io/*`
  - `https://api.duckduckgo.com/*`
  - `https://sonosuite.zendesk.com/*`

**⚠️ REQUIRED MAINTENANCE**: If you change domains or services:
- Update permissions in `manifest.json`
- Verify all necessary hosts are included

### 📋 **Periodic Maintenance List**

#### **Monthly**
1. **Verify Google Sheets**: Ensure all reference sheets are updated
2. **Review Spotify Dataset**: Confirm popular songs dataset is current
3. **Test CORS Proxies**: Verify proxies are still working

#### **Quarterly**
1. **Review CSS Selectors**: Verify Sonosuite selectors still work
2. **Update Reference Lists**: Review and update blacklists, curated artists, terms
3. **Test Zendesk Integration**: Verify ticket search works correctly

#### **Annually**
1. **Review Permissions**: Verify all extension permissions are still necessary
2. **Update Dependencies**: Review if there are new API or service versions
3. **Documentation**: Update this documentation with changes made

### 5) Audio Analysis System
- **Optimized Audio Analysis**: Parallel processing of multiple tracks for faster results
- **Modal Detection**: Automatic detection of important modals to avoid conflicts
- **Real-time Control**: Enable/disable audio analysis in real-time
- **Error Handling**: Robust error handling with fallback mechanisms
- **Performance Monitoring**: System status indicators for analysis progress

### 6) Tenant Information System
- **Dynamic Loading**: Tenant data loaded from Google Sheets in real-time
- **Fraud Points Ranking**: Position-based fraud scoring system
- **Considerations**: Tenant-specific considerations and notes
- **Automatic Updates**: Data refreshed automatically with each release analysis

## Usage
1. Navigate to a revision page in Sonosuite.
2. The "QC Copilot" panel is automatically injected. You can move it from side to side and resize it. The `body` margin adjusts to avoid covering the UI.
3. Review the "👀 QC Checks" block to see grouped alerts. Search icons appear to the left of each match and are white for better contrast.
4. Activate "Clean mode" if you prefer a compact view.
5. Use the audio analysis toggle to control real-time audio analysis.
6. Monitor system status indicators for analysis progress and modal states.

## Accessibility Notes
- When closing the history modal, focus is released before hiding to avoid `aria-hidden` with focused descendant.
- Audio analysis controls include proper ARIA labels and status indicators.
- System status messages are announced to screen readers.

## Support
If something gets stuck in "Loading QC", check the console for "iframe not ready". Retry usually resolves it; otherwise, reload the page.

For audio analysis issues:
- Check if important modals are open
- Verify audio analysis is enabled
- Monitor system status indicators
- Use the refresh analysis button if needed

---

## Testing Protocol

### **Phase 1: Individual Validation Testing**
1. Test each validation individually using the specific release conditions
2. Verify correct detection and display of each validation type
3. Check color coding (red vs yellow) and severity levels

### **Phase 2: Integration Testing**
1. Test multiple validations on the same release
2. Verify proper grouping and display of results
3. Check interaction between different validation types

### **Phase 3: System Testing**
1. Test complete workflow from page load to results display
2. Verify all external integrations (Google Sheets, Spotify, Zendesk)
3. Check performance and error handling

### **Phase 4: Audio Analysis Testing**
1. Test audio analysis with various track configurations
2. Verify parallel processing and performance
3. Check modal detection and conflict avoidance
4. Test real-time control features

### **Phase 5: Tenant Information Testing**
1. Test tenant data loading from Google Sheets
2. Verify fraud points calculations and rankings
3. Check considerations display and updates

### **Phase 6: Edge Case Testing**
1. Test with unusual data formats
2. Verify system behavior under stress conditions
3. Check accessibility and responsive design
4. Test error handling and recovery mechanisms

This comprehensive testing approach will ensure all validations and system features are working correctly across different scenarios and edge cases.
