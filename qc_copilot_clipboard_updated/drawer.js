// drawer.js - FIXED VERSION with CSS grid and unified audio results

const SPOTIFY_TRACKS_URL = 'https://jgdm21.github.io/spotify-top-json/spotify_top_tracks.json';

// Sistema de logging configurable
const QC_LOGGING = {
  enabled: true,
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    VERBOSE: 4
  },
  currentLevel: 2, // Por defecto solo ERROR, WARN e INFO
  
  log(level, message, ...args) {
    if (!this.enabled || this.currentLevel < level) return;
    
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
    const prefix = `[QC ${levelNames[level]}]`;
    
    switch(level) {
      case 0: console.error(prefix, message, ...args); break;
      case 1: console.warn(prefix, message, ...args); break;
      case 2: console.info(prefix, message, ...args); break;
      case 3: console.log(prefix, message, ...args); break;
      case 4: console.log(prefix, message, ...args); break;
    }
  },
  
  // Métodos de conveniencia
  error: function(message, ...args) { QC_LOGGING.log(0, message, ...args); },
  warn: function(message, ...args) { QC_LOGGING.log(1, message, ...args); },
  info: function(message, ...args) { QC_LOGGING.log(2, message, ...args); },
  debug: function(message, ...args) { QC_LOGGING.log(3, message, ...args); },
  verbose: function(message, ...args) { QC_LOGGING.log(4, message, ...args); },
  
  // Función para cambiar el nivel de logging dinámicamente
  setLevel(level) {
    this.currentLevel = level;
    this.info(`Logging level set to ${level}`);
  },
  
  // Función para deshabilitar/habilitar logging
  setEnabled(enabled) {
    this.enabled = enabled;
    this.info(`Logging ${enabled ? 'enabled' : 'disabled'}`);
  }
};

// Sistema de recopilación de datos de comparación
const QC_COMPARISON_DATA = {
  data: {
    titleComparisons: [],
    artistComparisons: [],
    cleanStrOperations: [],
    summary: {
      totalComparisons: 0,
      exactMatches: 0,
      similarMatches: 0,
      noMatches: 0
    }
  },
  
  addTitleComparison(title1, title2, result, similarity = null) {
    this.data.titleComparisons.push({
      timestamp: Date.now(),
      original1: title1,
      original2: title2,
      clean1: cleanStrSimple(title1),
      clean2: cleanStrSimple(title2),
      result: result,
      similarity: similarity
    });
    this.updateSummary('title', result);
  },
  
  addArtistComparison(artist1, artist2, result, similarity = null) {
    this.data.artistComparisons.push({
      timestamp: Date.now(),
      original1: artist1,
      original2: artist2,
      clean1: cleanStrSimple(artist1),
      clean2: cleanStrSimple(artist2),
      result: result,
      similarity: similarity
    });
    this.updateSummary('artist', result);
  },
  
  addCleanStrOperation(input, output) {
    this.data.cleanStrOperations.push({
      timestamp: Date.now(),
      input: input,
      output: output
    });
  },
  
  updateSummary(type, result) {
    this.data.summary.totalComparisons++;
    if (result === 'exact') this.data.summary.exactMatches++;
    else if (result === 'similar') this.data.summary.similarMatches++;
    else this.data.summary.noMatches++;
  },
  
  getData() {
    return JSON.parse(JSON.stringify(this.data));
  },
  
  clearData() {
    this.data = {
      titleComparisons: [],
      artistComparisons: [],
      cleanStrOperations: [],
      summary: {
        totalComparisons: 0,
        exactMatches: 0,
        similarMatches: 0,
        noMatches: 0
      }
    };
  },
  
  exportData() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc_comparison_data_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Exponer funciones globales para control desde consola
window.qcLogLevel = (level) => QC_LOGGING.setLevel(level);
window.qcLogOff = () => QC_LOGGING.setEnabled(false);
window.qcLogOn = () => QC_LOGGING.setEnabled(true);
window.qcData = () => QC_COMPARISON_DATA.getData();
window.qcClearData = () => QC_COMPARISON_DATA.clearData();
window.qcExportData = () => QC_COMPARISON_DATA.exportData();

// ====================================
// FONT SIZE CONTROL SYSTEM
// ====================================
const QC_FONT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
const QC_FONT_LABELS = { 'xs': 'XS', 'sm': 'S', 'md': 'M', 'lg': 'L', 'xl': 'XL' };
const QC_FONT_STORAGE_KEY = 'qcFontSize';

function initFontSizeControls() {
  const savedSize = localStorage.getItem(QC_FONT_STORAGE_KEY) || 'md';
  applyFontSize(savedSize);

  const decreaseBtn = document.getElementById('qc-font-decrease');
  const increaseBtn = document.getElementById('qc-font-increase');
  const fontLabel = document.getElementById('qc-font-label');

  if (decreaseBtn) {
    decreaseBtn.onclick = () => {
      const current = getCurrentFontSize();
      const idx = QC_FONT_SIZES.indexOf(current);
      if (idx > 0) {
        const newSize = QC_FONT_SIZES[idx - 1];
        applyFontSize(newSize);
        localStorage.setItem(QC_FONT_STORAGE_KEY, newSize);
      }
    };
  }

  if (increaseBtn) {
    increaseBtn.onclick = () => {
      const current = getCurrentFontSize();
      const idx = QC_FONT_SIZES.indexOf(current);
      if (idx < QC_FONT_SIZES.length - 1) {
        const newSize = QC_FONT_SIZES[idx + 1];
        applyFontSize(newSize);
        localStorage.setItem(QC_FONT_STORAGE_KEY, newSize);
      }
    };
  }
}

function getCurrentFontSize() {
  for (const size of QC_FONT_SIZES) {
    if (document.body.classList.contains(`qc-font-${size}`)) {
      return size;
    }
  }
  return 'md';
}

function applyFontSize(size) {
  // Remove all font size classes
  QC_FONT_SIZES.forEach(s => document.body.classList.remove(`qc-font-${s}`));
  // Add the new one
  document.body.classList.add(`qc-font-${size}`);
  // Update label
  const fontLabel = document.getElementById('qc-font-label');
  if (fontLabel) {
    fontLabel.textContent = QC_FONT_LABELS[size];
  }
  QC_LOGGING.debug(`Font size changed to: ${size}`);
}

// Initialize font controls when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFontSizeControls);
} else {
  initFontSizeControls();
}

// MODIFICADO: No bloquear el render por Spotify
// Prefetch pero sin bloquear
if (!window.__spotifyTopTracksPromise) {
  window.__spotifyTopTracksPromise = fetch(SPOTIFY_TRACKS_URL)
    .then(r => r.json())
    .catch(() => []);
}

// Objeto que contiene los títulos y descripciones para cada validación
const validationDetails = {
  'Release previously rejected': {
    title: 'Release Previously Rejected',
    description: 'This release was previously rejected. While this doesn\'t automatically warrant rejection in this review, examine the previous rejection reason carefully to determine if the issue persists or if fraud is involved. Releases with multiple prior rejections are typically prone to rejection again. Proceed with caution and thoroughly investigate the original concerns.'
  },
  'User has Strikes': {
    title: 'User Has Strikes',
    description: 'The user has prior strikes on their profile. While not direct evidence of fraud, strikes indicate problematic content history, whether for copyright infringement or artificial streaming. Review the release thoroughly, paying special attention to content patterns and legitimacy when the user has previous content violations.'
  },
  'User has Zendesk ticket(s)': {
    title: 'User Has Zendesk Tickets',
    description: (ticketCount, fraudTickets) => {
      let desc = `The user has open or historical support tickets`;
      if (ticketCount !== undefined && ticketCount !== null) {
        desc += `, totaling ${ticketCount} ticket(s)`;
      }
      if (fraudTickets !== undefined && fraudTickets !== null) {
        desc += ` (${fraudTickets} fraud-related)`;
      }
      desc += `. This is not an immediate red flag, but examine the user's content carefully if they have a high volume of tickets, especially fraud-related ones. Note: This criterion does not apply if the user is a platform admin, as all tickets are routed to them.`;
      return desc;
    }
  },
  'Match with Blacklisted Email': {
    title: 'Match with Blacklisted Email',
    description: 'The email matches a blacklisted address, indicating potentially fraudulent or sensitive content. This alert requires verification as it almost certainly indicates non-approvable content unless it\'s a false positive. Investigate thoroughly before proceeding - rejection is highly likely unless legitimate authorization can be confirmed.'
  },
  'Match with Blacklisted Artist': {
    title: 'Match with Blacklisted Artist',
    description: 'The artist name matches a blacklisted artist, indicating potentially fraudulent or sensitive content. This alert requires verification as it almost certainly indicates non-approvable content unless it\'s a false positive. Investigate thoroughly before proceeding - rejection is highly likely unless legitimate authorization can be confirmed.'
  },
  'Match with Blacklisted Label': {
    title: 'Match with Blacklisted Label',
    description: 'The label matches a blacklisted entry, typically major labels (Warner, Sony, Universal, etc.) that users rarely have legitimate rights to use. Review carefully as this can result in DSP penalties. Verify if the user has legitimate rights to use this label - be cautious not to reject legitimate false positives, but scrutinize claimed major label releases.'
  },
  'Match with Curated Artist': {
    title: 'Match with Curated Artist',
    description: 'The artist name appears in the curated artist list in the release metadata. Many cases may be false positives, but confirmed real cases require the user/admin to provide proper documentation. Verify this thoroughly before approval - failure to do so will almost certainly result in DSP blocking and reporting. Do not approve lightly without proper verification.'
  },
  'No tracks found': {
    title: 'No Tracks Found',
    description: 'The release appears to contain no audio tracks. Request that the user edit the submission to include tracks, or reject the release directly as it cannot be processed without audio content.'
  },
  'Suspicious audio matches detected': {
    title: 'Suspicious Audio Matches Detected',
    description: 'Audio matches suggest potentially fraudulent content. Conduct rigorous review to determine whether to proceed with rejection, request modifications, or approve if it\'s a legitimate false positive. Listen to the content and compare with matched references to make an informed decision.'
  },
  'Potential mashup detected': {
    title: 'Potential Mashup Detected',
    description: 'A track or release title follows the \'Title X Title\' format, commonly used in mashups. This typically indicates non-legitimate, unauthorized content mixing multiple sources. Reject these cases as it\'s highly unusual for users to have licenses to mix content from multiple parties. Exercise caution to identify legitimate false positives that may be approvable.'
  },
  'Language at release': {
    title: 'Language at Release',
    description: (lang) => `The release language is Turkish or Vietnamese. While not a direct fraud indicator and these languages are approvable, review the content carefully as sensitive content is commonly found associated with these languages. Conduct detailed content examination.`
  },
  'Language in track': {
    title: 'Language in Track',
    description: (trackTitle, lang) => `Track "${trackTitle}" is in Turkish or Vietnamese. While not a direct fraud indicator and these languages are approvable, review the content carefully as sensitive content is commonly found associated with these languages. Conduct detailed content examination.`
  },
  'Track duration >= 20min': {
    title: 'Track Duration >= 20 Minutes',
    description: (trackTitle, duration) => `Track "${trackTitle}" has an unusually long duration (${duration || '20+ minutes'}). Listen to the content to determine its nature and ensure it\'s not prohibited content (podcasts, audiobooks, generic content, continuous mixes, DJ sets, etc.). This is not grounds for automatic rejection - the content must be reviewed to determine if it\'s a legitimate song.`
  },
  'Track duration <= 30s': {
    title: 'Track Duration <= 30 Seconds',
    description: (trackTitle, duration) => `Track "${trackTitle}" has a very short duration (${duration || '30 seconds or less'}). Verify this is not a snippet or other non-legitimate content. For a track to be considered independent, it must exceed 30 seconds duration. Exception: this can be allowed if it serves as an interlude between other tracks (common in conceptual albums, especially rock and metal).`
  },
  'Track duration 00:00:00': {
    title: 'Track Duration Shows 00:00:00',
    description: (trackTitle) => `Track "${trackTitle || 'Unknown Track'}" shows a total duration of 00:00:00 in the player. This usually means the audio is missing or failed to load. Check the track status in the core platform to confirm the audio file is correctly attached.`
  },
  'Version': {
    title: 'Version Tag Detected',
    description: (version) => `A version field has been populated. This doesn\'t warrant rejection but review carefully as it may indicate content nature and required treatments (live content, covers, etc.). Pay close attention to the information the user provides and verify appropriate terminology - expressions like \'Original Version\' or formats like \'MP3\', \'WAV\', \'TikTok\' are not valid version descriptors.`
  },
  'Track Version': {
    title: 'Track Version Tag Detected',
    description: (trackTitle, version) => `Track "${trackTitle}" has a version field populated. This doesn\'t warrant rejection but review carefully as it may indicate content nature and required treatments (live content, covers, etc.). Pay close attention to the information the user provides and verify appropriate terminology - expressions like \'Original Version\' or formats like \'MP3\', \'WAV\', \'TikTok\' are not valid version descriptors.`
  },
  'Composer format invalid': {
    title: 'Composer Name Format',
    description: 'Each composer entry should include at least a first and last name (for example, \"John Doe\"). Middle names or initials are fine, but single names or initials without a surname need correction; separate multiple composers with commas.'
  },
  'Lyricist format invalid': {
    title: 'Lyricist Name Format',
    description: 'Each lyricist entry should include at least a first and last name (for example, \"John Doe\"). Middle names or initials are fine, but single names or initials without a surname need correction; separate multiple lyricists with commas.'
  },
  'User not verified': {
    title: 'User Not Verified',
    description: 'The user has not completed identity verification. While not a blocking factor, consider that this somewhat compromises the user\'s legitimacy and review their content with this in mind. Do not reject solely for this reason unless the reviewer deems it appropriate based on other factors.'
  },
  'Match with Suspicious Term': {
    title: 'Match with Suspicious Term',
    description: 'Metadata contains terms that may be considered sensitive or require additional review. Many are not blocking factors but indicate the release\'s nature - listening to tracks or detailed investigation may be necessary. For example, functional terms may indicate generic/spam content, which is not permitted.'
  },
  'Audio matches found': {
    title: 'Audio Matches Found',
    description: (count) => `Tracks show audio analysis matches. Review match details carefully, listen to content if necessary, and compare with original tracks to determine if this is legitimate, valid, and approvable content. Proceed with caution and make informed decisions based on the comparison results.`
  },
  'Explicit content detected': {
    title: 'Explicit Content Detected',
    description: 'One or more tracks are marked as explicit. This is not a blocking factor, but ensure the content is not excessively explicit, violent, or inciting hatred in any way (for example, Nazi apologies are also not permitted). Review the explicit content carefully and proceed with appropriate caution.'
  },
  'Release Title matches top song': {
    title: 'Release Title Matches Top Song',
    description: (title) => `The release title matches a song in the famous songs database. This is not a blocking factor but indicates potential concern. Listen to both the reference top song and the release to determine if it\'s a coincidence, cover, or unauthorized remix. Proceed with caution according to your findings.`
  },
  'Track matches top song': {
    title: 'Track Matches Top Song',
    description: (trackTitle, title) => `Track "${trackTitle}" title matches a song in the famous songs database. This is not a blocking factor but indicates potential concern. Listen to both the reference top song and the track to determine if it\'s a coincidence, cover, or unauthorized remix. Proceed with caution according to your findings.`
  },
  'Tracks between 1:00 and 1:59': {
    title: 'Short Tracks Pattern Detected',
    description: 'Release tracks have unusually short durations. This may indicate content generated for artificial streaming practices with generic, AI, or spam nature. Proceed with caution. Do not reject solely for this reason unless a pattern is confirmed, as there may be legitimate cases.'
  },
  'Suspicious email domain detected': {
    title: 'Suspicious Email Domain Detected',
    description: 'The user has a suspicious email domain, frequently used for spam practices related to artificial streaming. Investigate thoroughly to check if there\'s history with this user or if the content shows suspicious patterns. Proceed with caution and conduct detailed review.'
  },
  'Audio matches in tracks': {
    title: 'Audio Matches in Specific Tracks',
    description: 'Specific tracks show audio analysis matches. Review match details carefully, listen to content if necessary, and compare with original tracks to determine if this is legitimate, valid, and approvable content. Proceed with caution and make informed decisions based on the comparison results.'
  },
  'Audio title very similar': {
    title: 'Audio Title Very Similar',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with very similar titles (80%+ similarity). This may indicate minor typos or variations in the track title. Review carefully to determine if this is legitimate content or a potential copyright issue.`
  },
  'Audio title moderately similar': {
    title: 'Audio Title Moderately Similar',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with moderately similar titles (60-79% similarity). This suggests some relationship between the titles but requires careful review to determine legitimacy.`
  },
  'Audio title different': {
    title: 'Audio Title Different',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with completely different titles. This is concerning as it suggests the audio content may not match the claimed track information. Investigate thoroughly.`
  },
  'Audio artist very similar': {
    title: 'Audio Artist Very Similar',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with very similar artist names (80%+ similarity). This may indicate minor typos or variations in artist names. Review carefully.`
  },
  'Audio artist moderately similar': {
    title: 'Audio Artist Moderately Similar',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with moderately similar artist names (60-79% similarity). This suggests some relationship but requires careful review.`
  },
  'Audio artists different': {
    title: 'Audio Artists Different',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with completely different artists. This is concerning as it suggests the audio content may not match the claimed artist information. Investigate thoroughly.`
  },
  'Audio additional artists': {
    title: 'Audio Additional Artists',
    description: (trackTitle, count) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with multiple artists detected. This may indicate collaborations, features, or remixes. Verify the legitimacy of all artist contributions.`
  },
  'Audio analysis consolidated': {
    title: 'Audio Analysis Results',
    description: (trackTitle, count, details) => `Track "${trackTitle}" has ${count} audio match${count > 1 ? 'es' : ''} with the following issues: ${details}. This consolidated view shows all detected problems in one place. Review each issue carefully to determine if the content is legitimate and approvable.`
  },
  'Score 100%': {
    title: 'Score 100% - Perfect Audio Match',
    description: 'This track has a 100% audio similarity score, indicating a perfect match with existing content. This is a critical red flag that requires immediate attention. Listen to both the submitted track and the matched reference to determine if this is legitimate content (cover, remix with permission) or unauthorized duplication. Rejection is highly likely unless proper authorization can be confirmed.'
  },
  'Similar title': {
    title: 'Similar Title Detected',
    description: 'The track title shows high similarity (80%+) with existing content. This may indicate minor typos, variations, or potential copyright issues. Review carefully to determine if this is legitimate content or requires modification. Listen to both tracks if necessary to make an informed decision.'
  },
  'Similar title but different artist': {
    title: 'Similar Title with Different Artist',
    description: 'The track title is very similar to existing content but the artist is different. This is concerning as it suggests potential unauthorized use of titles. Review thoroughly to determine if this is legitimate content, a coincidence, or requires rejection. Listen to both tracks to assess the situation.'
  },
  'Similar artist': {
    title: 'Similar Artist Name Detected',
    description: 'The artist name shows high similarity (80%+) with existing artists. This may indicate minor typos, variations, or potential impersonation. Review carefully to determine if this is legitimate content or requires modification. Verify the artist\'s identity if necessary.'
  },
  'Title matches curated artist': {
    title: 'Title Matches Curated Artist',
    description: 'The track title matches a name from the curated artist list. This is a critical red flag indicating potential unauthorized use of a famous artist\'s name or title. Verify thoroughly before approval - failure to do so will almost certainly result in DSP blocking and reporting. Do not approve without proper verification.'
  },
  'Artist matches curated artist': {
    title: 'Artist Matches Curated Artist',
    description: 'The artist name matches an entry from the curated artist list. This is a critical red flag indicating potential impersonation or unauthorized use of a famous artist\'s name. Verify thoroughly before approval - failure to do so will almost certainly result in DSP blocking and reporting. Do not approve without proper verification.'
  },
  // ===== METADATA VALIDATION RULES =====
  'zxx_with_lyricist': {
    title: 'Language/Lyricist Conflict',
    description: 'Track Audio Language is set to "zxx" (no linguistic content) but has a Lyricist assigned. If the track is instrumental or has no lyrics, it should not have a Lyricist. Either remove the Lyricist or change the Track Audio Language to the appropriate language.'
  },
  'instrumental_with_lyricist': {
    title: 'Instrumental Track with Lyricist',
    description: 'Track Version indicates this is an Instrumental track, but a Lyricist is assigned. Instrumental tracks should not have Lyricist credits. Review and correct this inconsistency.'
  },
  'explicit_clean_in_title': {
    title: 'Explicit/Clean in Title',
    description: 'The track title contains "(Explicit)" or "(Clean)". These designations should NOT be included in the title field - use the dedicated Explicit field instead to mark content rating.'
  },
  'explicit_clean_in_version': {
    title: 'Explicit/Clean in Version',
    description: 'The Track Version field contains "(Explicit)" or "(Clean)". These designations should NOT appear in the version field. Content rating should be set using the Explicit field only.'
  },
  'explicit_clean_in_release_title': {
    title: 'Explicit/Clean in Release Title',
    description: 'The Release Title contains "(Explicit)" or "(Clean)". These designations should NOT be included in the release title. Use the appropriate content rating field instead.'
  },
  'ampersand_in_lyricist': {
    title: 'Compound Credit in Lyricist',
    description: 'Lyricist field contains "&" character. Compound credits using "&" are not permitted. Use commas to separate multiple lyricist names (e.g., "John Smith, Jane Doe" instead of "John Smith & Jane Doe").'
  },
  'ampersand_in_composer': {
    title: 'Compound Credit in Composer',
    description: 'Composer field contains "&" character. Compound credits using "&" are not permitted. Use commas to separate multiple composer names (e.g., "John Smith, Jane Doe" instead of "John Smith & Jane Doe").'
  },
  'ampersand_in_release_lyricist': {
    title: 'Compound Credit in Release Lyricist',
    description: 'Release-level Lyricist field contains "&" character. Compound credits using "&" are not permitted at release level either. Use commas to separate names.'
  },
  'ampersand_in_release_composer': {
    title: 'Compound Credit in Release Composer',
    description: 'Release-level Composer field contains "&" character. Compound credits using "&" are not permitted at release level either. Use commas to separate names.'
  },
  'mixed_alphabets_title': {
    title: 'Mixed Alphabets in Title',
    description: 'The track title contains characters from multiple writing systems (e.g., Latin and Cyrillic, or Latin and CJK). This may indicate a side-by-side literal translation, which is not permitted. Review manually to ensure proper formatting.'
  },
  'mixed_alphabets_release_title': {
    title: 'Mixed Alphabets in Release Title',
    description: 'The release title contains characters from multiple writing systems. This may indicate a side-by-side literal translation. Translations should not be placed together in the same title field. Review manually.'
  },
  'mixed_alphabets_artist': {
    title: 'Mixed Alphabets in Artist Name',
    description: 'An artist name contains characters from multiple writing systems. This may indicate improper formatting or a side-by-side translation. Review to ensure the artist name is correctly formatted.'
  },
  'mixed_alphabets_release_artist': {
    title: 'Mixed Alphabets in Release Artist',
    description: 'A release-level artist field contains characters from multiple writing systems. Review to ensure proper formatting and that this is not an improper side-by-side translation.'
  },
  'emoji_in_title': {
    title: 'Emoji in Track Title',
    description: 'The track title contains emoji characters. Emojis are not permitted in metadata fields including titles. Remove all emoji characters from the title.'
  },
  'emoji_in_version': {
    title: 'Emoji in Track Version',
    description: 'The Track Version field contains emoji characters. Emojis are not permitted in metadata fields. Remove all emoji characters from the version field.'
  },
  'emoji_in_release_title': {
    title: 'Emoji in Release Title',
    description: 'The release title contains emoji characters. Emojis are not permitted in metadata fields including release titles. Remove all emoji characters.'
  },
  'emoji_in_artist': {
    title: 'Emoji in Artist Credit',
    description: 'An artist credit field contains emoji characters. Emojis are not permitted in credit fields. Remove all emoji characters from artist names and credits.'
  },
  'emoji_in_release_artist': {
    title: 'Emoji in Release Artist',
    description: 'A release-level artist field contains emoji characters. Emojis are not permitted in any metadata fields. Remove all emoji characters.'
  },
  'clean_version_check': {
    title: 'Clean Version - Verify Explicit Exists',
    description: 'This track is marked as "Clean". A Clean version should only exist if there is a corresponding Explicit version that was previously distributed. Verify that an Explicit version of this track exists and was distributed before approving this Clean version.'
  },
  // ===== BACKOFFICE HISTORY ALERTS =====
  'user_has_rejected_releases': {
    title: 'User Has Rejected Releases',
    description: (count) => `The user has ${count} previously rejected release${count > 1 ? 's' : ''} in the backoffice. This is a significant red flag indicating a pattern of problematic content. Review the current release with heightened scrutiny and consider the rejection reasons of previous releases.`
  },
  'user_history_summary': {
    title: 'User History Summary',
    description: (summary) => `The user has ${summary.total} total release${summary.total > 1 ? 's' : ''} in the backoffice. This provides context about the user's submission history. A high volume with few rejections indicates reliability, while a high rejection rate warrants careful review.`
  },
  'release_previously_in_backoffice': {
    title: 'Release Previously in Backoffice',
    description: 'This specific release has been processed before in the backoffice. Check the previous status and any notes to understand the history of this release submission.'
  },
  'curated_artist_user_history': {
    title: 'Curated Artist - User History',
    description: (artistName, total, statusCounts) => {
      let statusStr = Object.entries(statusCounts)
        .map(([status, count]) => `${count} ${status}`)
        .join(', ');
      return `The curated artist "${artistName}" has ${total} release${total > 1 ? 's' : ''} by this same user email (${statusStr}). This may indicate the user has previously submitted content claiming to be this artist. Review carefully - if previously approved, verify documentation is on file. If previously rejected, this is a strong fraud indicator.`;
    }
  }
};

// Helpers de texto y seguridad
function cleanStrSimple(str) {
  const result = (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/^\d+\s*[-.]*\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // Solo registrar operaciones de limpieza si el logging está en modo VERBOSE
  QC_LOGGING.verbose(`cleanStrSimple: "${str}" -> "${result}"`);
  
  // Recopilar datos para análisis (opcional, solo si se necesita)
  if (QC_LOGGING.currentLevel >= QC_LOGGING.levels.VERBOSE) {
    QC_COMPARISON_DATA.addCleanStrOperation(str, result);
  }
  
  return result;
}

// Mejorar la búsqueda de coincidencias para títulos - con filtros para evitar falsos positivos
function findTitleMatch(title, allTracks) {
  if (!allTracks || !allTracks.length) return null;
  if (!title || typeof title !== 'string') return null;

  const titleTrimmed = title.trim();

  // 1. Filtrar títulos que son solo números (años como "2020", "2024", etc.)
  if (/^\d+$/.test(titleTrimmed)) {
    console.log(`[findTitleMatch] Skipping numeric-only title: "${titleTrimmed}"`);
    return null;
  }

  // 2. Filtrar títulos muy cortos (menos de 3 caracteres después de limpiar)
  const tClean = cleanStrSimple(titleTrimmed);
  if (tClean.length < 3) {
    console.log(`[findTitleMatch] Skipping too-short title: "${titleTrimmed}" (clean: "${tClean}")`);
    return null;
  }

  // 3. Filtrar títulos que son solo números después de limpiar
  if (/^\d+$/.test(tClean)) {
    console.log(`[findTitleMatch] Skipping numeric-only cleaned title: "${titleTrimmed}" -> "${tClean}"`);
    return null;
  }

  // 4. Detectar si el título contiene SOLO caracteres no latinos (sin letras latinas)
  const hasNonLatinChars = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06ff\u0590-\u05ff\u0400-\u04ff]/u.test(titleTrimmed);
  const hasLatinChars = /[a-zA-Z]/.test(titleTrimmed);

  // Si tiene caracteres no latinos y NO tiene caracteres latinos, skip
  if (hasNonLatinChars && !hasLatinChars) {
    console.log(`[findTitleMatch] Skipping non-Latin only title: "${titleTrimmed}"`);
    return null;
  }

  // 5. Filtrar títulos genéricos comunes que causan falsos positivos
  const genericTitles = [
    'intro', 'outro', 'interlude', 'skit', 'untitled', 'track', 'bonus',
    'remix', 'instrumental', 'acoustic', 'live', 'demo', 'version',
    'part 1', 'part 2', 'part 3', 'vol 1', 'vol 2', 'chapter'
  ];
  if (genericTitles.includes(tClean)) {
    console.log(`[findTitleMatch] Skipping generic title: "${titleTrimmed}"`);
    return null;
  }

  // Buscar coincidencia exacta primero
  const exactMatch = allTracks.find(t => t.track === titleTrimmed);
  if (exactMatch) return exactMatch;

  // Buscar coincidencia con título limpio
  return allTracks.find(t => cleanStrSimple(t.track) === tClean);
}

function escapeHTML(s) {
  // Convertir a string de forma segura
  const str = (s == null) ? '' : String(s);
  return str.replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
}

function showDuckModal(query) {
  const modal = document.createElement('div');
  modal.className = 'qc-modal';
  modal.innerHTML = `
    <div class="qc-modal-bg"></div>
    <div class="qc-modal-dialog">
      <div class="qc-modal-header">
        <span>Search Results: <b>${escapeHTML(query)}</b></span>
        <button class="qc-modal-close" title="Close">×</button>
      </div>
      <div class="qc-modal-content"><div class="qc-spinner"></div>Loading information...</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.qc-modal-close').onclick =
  modal.querySelector('.qc-modal-bg').onclick = () => modal.remove();

  fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=us-en`)
    .then(r => r.json())
    .then(data => {
      let html = '';
      if (data.Abstract) html += `<div style="margin-bottom:16px;"><b>Summary:</b><br>${escapeHTML(data.Abstract)}</div>`;
      else html += `<div style="color:#6b7280;">No summary found for this query.</div>`;
      if (data.RelatedTopics?.length) {
        html += `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;"><b>Related Information:</b><ul style="margin-top:8px;">`;
        data.RelatedTopics.slice(0,4).forEach(t => {
          if (t.Text && t.FirstURL) {
            html += `<li style="margin-bottom:8px;"><a href="${escapeHTML(t.FirstURL)}" target="_blank">${escapeHTML(t.Text)}</a></li>`;
          }
        });
        html += `</ul></div>`;
      }
      modal.querySelector('.qc-modal-content').innerHTML = html;
    })
    .catch(() => {
      modal.querySelector('.qc-modal-content').innerHTML = `<div style="color:#ef4444;">Could not load information. Please try again later.</div>`;
    });
}

function renderCover(coverUrl) {
  if (!coverUrl) return '<span class="text-gray">No cover available</span>';
  return `<img id="qc-cover-big" 
    src="${escapeHTML(coverUrl)}" 
    alt="Release cover"
    title="Click to enlarge"
    onerror="this.style.display='none'; 
             this.insertAdjacentHTML('afterend', '<div style=\\'background:#f3f4f6;padding:40px;text-align:center;border-radius:8px;color:#6b7280;\\'>Cover image unavailable</div>');
             const parentDiv = this.closest('.qc-cover-wrapper');
             if (parentDiv) {
               const yandexBtn = parentDiv.querySelector('.qc-yandex-search-button');
               if (yandexBtn) yandexBtn.style.display = 'none';
             }
            "
  />`;
}

function duckIconSVG() {
  return `<svg fill="currentColor" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color:#ffffff;">
    <path d="M21 19l-5.154-5.154a7 7 0 1 0-1.414 1.414L19 21l2-2zM10 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
  </svg>`;
}

function youtubeIconSVG() {
  return `<svg fill="currentColor" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color:#ffffff;">
    <path d="M23.498 6.186a3.007 3.007 0 0 0-2.118-2.128C19.517 3.5 12 3.5 12 3.5s-7.517 0-9.38.558A3.007 3.007 0 0 0 .502 6.186 31.134 31.134 0 0 0 0 12a31.134 31.134 0 0 0 .502 5.814 3.007 3.007 0 0 0 2.118 2.128C4.483 20.5 12 20.5 12 20.5s7.517 0 9.38-.558a3.007 3.007 0 0 0 2.118-2.128A31.134 31.134 0 0 0 24 12a31.134 31.134 0 0 0-.502-5.814ZM9.75 15.5v-7l6 3.5-6 3.5Z"/>
  </svg>`;
}

function questionMarkSVG() {
  return `❔`;
}

function showValidationDetailsModal(title, description) {
  const modal = document.createElement('div');
  modal.className = 'qc-modal';
  modal.innerHTML = `
    <div class="qc-modal-bg"></div>
    <div class="qc-modal-dialog">
      <div class="qc-modal-header">
        <span>${escapeHTML(title)}</span>
        <button class="qc-modal-close" title="Close">×</button>
      </div>
      <div class="qc-modal-content">
        <p>${escapeHTML(description)}</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.qc-modal-close').onclick =
  modal.querySelector('.qc-modal-bg').onclick = () => modal.remove();
}

function renderSectionHeader(title) {
  return `<tr><td colspan="2" class="qc-parent-title">${escapeHTML(title)}</td></tr>`;
}

function renderRow(label, value) {
  return `<tr><td class="qc-child-label">${escapeHTML(label)}:</td><td class="qc-child-value">${value}</td></tr>`;
}

// QC Workload functions removed - feature no longer used

function renderFlagCell(items, isDuck) {
  if (!items?.length) return '–';
  return `<ul class="qc-flag-list">${items.map(i =>
    `<li>${escapeHTML(i)}${isDuck?`<a href="#" class="qc-duck-search" data-query="${escapeHTML(i)}">${duckIconSVG()}</a>`:''}</li>`
  ).join('')}</ul>`;
}

function isZeroDuration(durationStr) {
  if (!durationStr) return false;
  const raw = String(durationStr).split('/').pop().trim();
  if (!raw) return false;
  const normalized = raw.replace(/\s+/g, '');
  return /^0{1,2}:0{2}(?::0{2})?$/.test(normalized);
}

function showWarnings(rd) {
  const w = [];
  const lang = s => (s||'').toLowerCase();
  
  const relLang = lang(rd.basicInfo?.Metadata['Language']);
  if (['tr','vi','turkish','vietnamese'].includes(relLang)) {
    w.push({ msg: 'Language at release', color: 'red', rawMsgKey: 'Language at release', flagValue: [relLang], dynamicParams: { lang: relLang } });
  }
  
  rd.trackSections.forEach((t) => {
    const tLang = lang(t.sections.Metadata['Language']);
    const trackTitle = t.header || 'Unknown Track';
    if (['tr','vi','turkish','vietnamese'].includes(tLang)) {
      w.push({ msg: `Language in track "${trackTitle}"`, color: 'red', rawMsgKey: 'Language in track', flagValue: [tLang], dynamicParams: { trackTitle: trackTitle, lang: tLang } });
    }
  });
  
  let tot = 0, med = 0;
  const zeroDurations = [];
  rd.trackSections.forEach((t) => {
    const trackTitle = t.header || 'Unknown Track';
    if (isZeroDuration(t.duration || '')) {
      zeroDurations.push(trackTitle);
    }
    const parts = (t.duration||'').split(':').map(x=>parseInt(x,10)||0);
    while(parts.length<3) parts.unshift(0);
    const secs = parts[0]*3600 + parts[1]*60 + parts[2];
    if (!secs) return;
    if (secs >= 1200) {
      // CORREGIDO: Mensaje genérico sin mostrar duración específica
      w.push({ msg: `Track "${trackTitle}" Duration >= 20min`, color:'red', rawMsgKey: 'Track duration >= 20min', flagValue: [], dynamicParams: { trackTitle: trackTitle } });
    }
    if (secs <= 30) {
      // CORREGIDO: Mensaje genérico sin mostrar duración específica
      w.push({ msg: `Track "${trackTitle}" Duration <= 30s`, color:'red', rawMsgKey: 'Track duration <= 30s', flagValue: [], dynamicParams: { trackTitle: trackTitle } });
    }
    if (secs >= 60 && secs < 120) med++;
    tot++;
  });
  if (zeroDurations.length) {
    w.push({
      msg: `Tracks with 00:00:00 (${zeroDurations.length})`,
      color: 'red',
      rawMsgKey: 'Track duration 00:00:00',
      flagValue: zeroDurations.map(t => `Track "${t}"`),
      dynamicParams: { count: zeroDurations.length }
    });
  }
  if (tot > 0 && med / tot >= 0.8) {
    w.push({ msg: '>=80% of tracks between 1:00 and 1:59', color:'yellow', rawMsgKey: 'Tracks between 1:00 and 1:59' });
  }
  
  const parsed = rd.trackSections.map(t => {
    const raw = t.header || '';
    const m = raw.match(/^\s*(\d+)/);
    const num = m ? parseInt(m[1], 10) : null;
    const titleNoNum = raw.replace(/^\s*\d+[).\-]?\s*/, '');
    return { num, title: cleanStrSimple(titleNoNum) };
  });
  const allHaveNum = parsed.every(p => typeof p.num === 'number' && !Number.isNaN(p.num));
  const titlesOrdered = (allHaveNum ? parsed.slice().sort((a,b) => a.num - b.num) : parsed).map(p => p.title);
  
  // MEJORADO: Detectar orden alfabético flexible (A-Z y Z-A)
  const isAlphabetical = titlesOrdered.length > 1 && (
    titlesOrdered.slice().join() === titlesOrdered.slice().sort().join() || // A-Z
    titlesOrdered.slice().join() === titlesOrdered.slice().sort().reverse().join() // Z-A
  );
  
  if (isAlphabetical) {
    // MEJORADO: Determinar la dirección del orden alfabético
    const isAscending = titlesOrdered.slice().join() === titlesOrdered.slice().sort().join();
    const direction = isAscending ? 'A-Z' : 'Z-A';
    w.push({ msg: `Tracks in alphabetical order (${direction})`, color:'yellow', rawMsgKey: 'Tracks in alphabetical order' });
  }
  
  return w;
}

// Versión mejorada de warnings (duración robusta y misma semántica que la hoja)
function parseDurationToSeconds(durationStr) {
  if (!durationStr) return 0;

  // Si viene en formato "00:29 / 03:20", quedarnos con la parte total (después de la barra)
  const raw = String(durationStr).split('/').pop().trim();
  if (!raw) return 0;

  const parts = raw.split(':').map(x => parseInt(x, 10));
  if (!parts.length || parts.some(p => Number.isNaN(p))) return 0;

  while (parts.length < 3) parts.unshift(0);
  const [h, m, s] = parts;
  const secs = h * 3600 + m * 60 + s;
  return Number.isFinite(secs) && secs > 0 ? secs : 0;
}

function showWarningsV2(rd) {
  const w = [];
  const lang = s => (s || '').toLowerCase();

  const relLang = lang(rd.basicInfo?.Metadata['Language']);
  if (['tr', 'vi', 'turkish', 'vietnamese'].includes(relLang)) {
    w.push({
      msg: 'Language at release',
      color: 'red',
      rawMsgKey: 'Language at release',
      flagValue: [relLang],
      dynamicParams: { lang: relLang }
    });
  }

  (rd.trackSections || []).forEach((t) => {
    const tLang = lang(t.sections?.Metadata?.['Language']);
    const trackTitle = t.header || 'Unknown Track';
    if (['tr', 'vi', 'turkish', 'vietnamese'].includes(tLang)) {
      w.push({
        msg: `Language in track "${trackTitle}"`,
        color: 'red',
        rawMsgKey: 'Language in track',
        flagValue: [tLang],
        dynamicParams: { trackTitle: trackTitle, lang: tLang }
      });
    }
  });

  let tot = 0, med = 0;
  const zeroDurations = [];
  (rd.trackSections || []).forEach((t) => {
    const trackTitle = t.header || 'Unknown Track';
    const durationText = t.duration || '';
    if (isZeroDuration(durationText)) {
      zeroDurations.push(trackTitle);
    }

    // Intentar primero con la duracion obtenida del reproductor
    let secs = parseDurationToSeconds(durationText);

    // Fallback: intentar con cualquier metadato que contenga "Duration"
    if (!secs && t.sections && t.sections.Metadata) {
      try {
        const metaDurationKey = Object.keys(t.sections.Metadata)
          .find(k => /duration/i.test(k));
        if (metaDurationKey) {
          secs = parseDurationToSeconds(t.sections.Metadata[metaDurationKey]);
        }
      } catch (_) { }
    }

    if (!secs) return;

    // > 20 minutos
    if (secs >= 1200) {
      w.push({
        msg: `Track "${trackTitle}" Duration >= 20min`,
        color: 'red',
        rawMsgKey: 'Track duration >= 20min',
        flagValue: [],
        dynamicParams: { trackTitle: trackTitle }
      });
    }

    // < 30 segundos
    if (secs <= 30) {
      w.push({
        msg: `Track "${trackTitle}" Duration <= 30s`,
        color: 'red',
        rawMsgKey: 'Track duration <= 30s',
        flagValue: [],
        dynamicParams: { trackTitle: trackTitle }
      });
    }

    if (secs >= 60 && secs < 120) med++;
    tot++;
  });

  if (zeroDurations.length) {
    w.push({
      msg: `Tracks with 00:00:00 (${zeroDurations.length})`,
      color: 'red',
      rawMsgKey: 'Track duration 00:00:00',
      flagValue: zeroDurations.map(t => `Track "${t}"`),
      dynamicParams: { count: zeroDurations.length }
    });
  }

  if (tot > 0 && med / tot >= 0.8) {
    w.push({
      msg: '>=80% of tracks between 1:00 and 1:59',
      color: 'yellow',
      rawMsgKey: 'Tracks between 1:00 and 1:59'
    });
  }

  // Mantener detección de orden alfabético como en showWarnings original
  const parsed = (rd.trackSections || []).map(t => {
    const raw = t.header || '';
    const m = raw.match(/^\s*(\d+)/);
    const num = m ? parseInt(m[1], 10) : null;
    const titleNoNum = raw.replace(/^\s*\d+[).\-]?\s*/, '');
    return { num, title: cleanStrSimple(titleNoNum) };
  });
  const allHaveNum = parsed.every(p => typeof p.num === 'number' && !Number.isNaN(p.num));
  const titlesOrdered = (allHaveNum ? parsed.slice().sort((a, b) => a.num - b.num) : parsed).map(p => p.title);

  const isAlphabetical = titlesOrdered.length > 1 && (
    titlesOrdered.slice().join() === titlesOrdered.slice().sort().join() || // A-Z
    titlesOrdered.slice().join() === titlesOrdered.slice().sort().reverse().join() // Z-A
  );

  if (isAlphabetical) {
    const isAscending = titlesOrdered.slice().join() === titlesOrdered.slice().sort().join();
    const direction = isAscending ? 'A-Z' : 'Z-A';
    w.push({
      msg: `Tracks in alphabetical order (${direction})`,
      color: 'yellow',
      rawMsgKey: 'Tracks in alphabetical order'
    });
  }

  return w;
}
 
function checkLooseXInTitles(releaseData) {
  const potentialMashups = [];
  const currentReleaseTitle = releaseData.title;

  if (currentReleaseTitle && /\bx\b/i.test(currentReleaseTitle)) {
    potentialMashups.push(`Release Title: "${currentReleaseTitle}"`);
  }

  releaseData.trackSections.forEach((track) => {
    const trackTitle = track.header;
    if (trackTitle && /\bx\b/i.test(trackTitle)) {
      potentialMashups.push(`Track "${trackTitle}"`);
    }
  });
  
  return potentialMashups;
}

function checkSuspiciousEmailDomain(releaseData) {
  const suspiciousDomains = [
    'protonmail.com',
    'tutanota.com', 
    'mail.ru',
    'yopmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'cock.li',
    'mailinator.com',
    'hushmail.com',
    'riseup.net'
  ];

  const userEmail = releaseData.cards?.User?.Email || '';
  if (!userEmail) return null;

  const emailDomain = userEmail.toLowerCase().split('@')[1];
  if (!emailDomain) return null;

  if (suspiciousDomains.includes(emailDomain)) {
    return emailDomain;
  }

  return null;
}

function normalizePersonNameInput(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s+/g, ', ')
    .trim();
}

function hasNameAndSurname(name) {
  const normalized = normalizePersonNameInput(name);
  if (!normalized || normalized === '-') return false;

  const tokens = normalized
    .split(/\s+/)
    .map(part => {
      const withoutMarks = part.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return withoutMarks.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    })
    .filter(Boolean);

  // Valid if: at least two alphabetic tokens; last token has >=2 letters (surname);
  // and there is at least one other token with >=2 letters (given name). Allows middle initials.
  const letterTokens = tokens.filter(part => /[a-zA-Z]/.test(part));
  if (letterTokens.length < 2) return false;
  const surname = letterTokens[letterTokens.length - 1];
  if (surname.replace(/[^a-zA-Z]/g, '').length < 2) return false;
  const hasGiven = letterTokens.slice(0, -1).some(t => t.replace(/[^a-zA-Z]/g, '').length >= 2);
  return hasGiven;
}

function findInvalidCreditNames(releaseData) {
  const invalid = { composer: [], lyricist: [] };
  const buckets = {
    composer: new Map(),
    lyricist: new Map()
  };

  const addInvalid = (type, name, context) => {
    const normalizedName = normalizePersonNameInput(name);
    if (!normalizedName) return;
    const key = `${type}|${normalizedName}`.toLowerCase();
    if (!buckets[type].has(key)) {
      buckets[type].set(key, { name: normalizedName, contexts: new Set() });
    }
    if (context) buckets[type].get(key).contexts.add(context);
  };

  const checkField = (rawValue, type, context) => {
    if (!rawValue) return;
    const names = String(rawValue)
      .split(',')
      .map(normalizePersonNameInput)
      .filter(n => n && n !== '-');
    names.forEach(n => {
      if (!hasNameAndSurname(n)) addInvalid(type, n, context);
    });
  };

  const basicArtists = releaseData?.basicInfo?.Artists || {};
  checkField(basicArtists['Composer'], 'composer', 'Release metadata');
  checkField(basicArtists['Lyricist'], 'lyricist', 'Release metadata');

  (releaseData?.trackSections || []).forEach((t, idx) => {
    const trackNumber = t.displayNumber || idx + 1;
    const context = `Track ${trackNumber}`;
    checkField(t.sections?.Artists?.Composer, 'composer', context);
    checkField(t.sections?.Artists?.Lyricist, 'lyricist', context);
  });

  ['composer', 'lyricist'].forEach(type => {
    buckets[type].forEach(entry => {
      invalid[type].push({
        name: entry.name,
        contexts: Array.from(entry.contexts)
      });
    });
  });

  return invalid;
}

// =====================================================
// VALIDACIONES DE METADATA - QC Rules
// =====================================================

/**
 * Detecta el uso de diferentes alfabetos/scripts en un texto
 * Retorna true si hay mezcla de scripts (posible traducción lado a lado)
 */
function detectMixedAlphabets(text) {
  if (!text || typeof text !== 'string') return { hasMixed: false, scripts: [] };

  const scriptPatterns = {
    latin: /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/u,
    cyrillic: /[\u0400-\u04FF]/u,
    greek: /[\u0370-\u03FF]/u,
    arabic: /[\u0600-\u06FF\u0750-\u077F]/u,
    hebrew: /[\u0590-\u05FF]/u,
    cjk: /[\u4E00-\u9FFF\u3400-\u4DBF]/u,           // Chinese
    hiragana: /[\u3040-\u309F]/u,                    // Japanese Hiragana
    katakana: /[\u30A0-\u30FF]/u,                    // Japanese Katakana
    hangul: /[\uAC00-\uD7AF\u1100-\u11FF]/u,        // Korean
    thai: /[\u0E00-\u0E7F]/u,
    devanagari: /[\u0900-\u097F]/u                   // Hindi
  };

  const detectedScripts = [];
  for (const [scriptName, pattern] of Object.entries(scriptPatterns)) {
    if (pattern.test(text)) {
      detectedScripts.push(scriptName);
    }
  }

  // Si hay más de un script detectado (excluyendo solo latin), es mezcla
  const hasMixed = detectedScripts.length > 1;

  return { hasMixed, scripts: detectedScripts };
}

/**
 * Detecta emojis en un texto
 * Usa un enfoque más conservador para evitar falsos positivos con números y texto normal
 */
function detectEmojis(text) {
  if (!text || typeof text !== 'string') return { hasEmojis: false, emojis: [] };

  // Regex más específica para emojis visuales reales
  // Excluye números, # y * que son Emoji_Component pero no emojis visuales
  const emojiRegex = /(?:[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}])+/gu;

  const matches = text.match(emojiRegex) || [];

  return { hasEmojis: matches.length > 0, emojis: matches };
}

/**
 * Detecta el carácter & en campos de créditos (compound credits no permitidos)
 */
function detectAmpersandInCredits(text) {
  if (!text || typeof text !== 'string') return false;
  return text.includes('&');
}

/**
 * Detecta (Explicit) o (Clean) en títulos o versiones
 */
function detectExplicitCleanInText(text) {
  if (!text || typeof text !== 'string') return { found: false, type: null };

  const lowerText = text.toLowerCase();
  if (/\(explicit\)/.test(lowerText) || /\[explicit\]/.test(lowerText)) {
    return { found: true, type: 'Explicit' };
  }
  if (/\(clean\)/.test(lowerText) || /\[clean\]/.test(lowerText)) {
    return { found: true, type: 'Clean' };
  }

  return { found: false, type: null };
}

/**
 * Función principal de validación de metadata
 * Retorna un array de alertas encontradas
 */
function validateMetadataRules(releaseData) {
  const alerts = [];

  if (!releaseData) return alerts;

  const tracks = releaseData.trackSections || [];

  // Helper para buscar campos con variantes de nombre
  const findField = (obj, ...variants) => {
    for (const key of variants) {
      if (obj[key] && obj[key] !== '-') return obj[key];
    }
    // Búsqueda parcial case-insensitive
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      for (const variant of variants) {
        if (lowerKey.includes(variant.toLowerCase())) {
          if (obj[key] && obj[key] !== '-') return obj[key];
        }
      }
    }
    return '';
  };

  // ===== VALIDACIONES POR TRACK =====
  tracks.forEach((track, idx) => {
    const trackNumber = track.displayNumber || idx + 1;
    const trackContext = `Track ${trackNumber}`;
    const metadata = track.sections?.Metadata || {};
    const artists = track.sections?.Artists || {};

    // Obtener campos relevantes (con variantes de nombres)
    const trackAudioLanguage = findField(metadata, 'Track Audio Language', 'Audio Language', 'Language');
    const trackVersion = findField(metadata, 'Track Version', 'Version');
    const trackTitle = track.header || '';
    const lyricist = findField(artists, 'Lyricist');
    const composer = findField(artists, 'Composer');
    const explicitStatus = findField(metadata, 'Explicit', 'Parental Advisory');

    // Debug log para verificar campos extraídos
    console.log(`[Metadata Validation] ${trackContext}:`, {
      trackAudioLanguage, trackVersion, explicitStatus, lyricist, composer,
      allMetadata: Object.keys(metadata),
      allArtists: Object.keys(artists)
    });

    // --- Rule: zxx + Lyricist ---
    if (trackAudioLanguage.toLowerCase() === 'zxx' && lyricist && lyricist !== '-') {
      alerts.push({
        type: 'error',
        rule: 'zxx_with_lyricist',
        context: trackContext,
        message: `${trackContext}: Track Audio Language is "zxx" (no linguistic content) but has Lyricist assigned`,
        field: 'Track Audio Language / Lyricist'
      });
    }

    // --- Rule: Instrumental + Lyricist ---
    const isInstrumental = /instrumental/i.test(trackVersion);
    if (isInstrumental && lyricist && lyricist !== '-') {
      alerts.push({
        type: 'error',
        rule: 'instrumental_with_lyricist',
        context: trackContext,
        message: `${trackContext}: Track Version contains "Instrumental" but has Lyricist assigned`,
        field: 'Track Version / Lyricist'
      });
    }

    // --- Rule: (Explicit) or (Clean) in titles/versions ---
    const titleCheck = detectExplicitCleanInText(trackTitle);
    if (titleCheck.found) {
      alerts.push({
        type: 'error',
        rule: 'explicit_clean_in_title',
        context: trackContext,
        message: `${trackContext}: Title contains "(${titleCheck.type})" - use Explicit field instead`,
        field: 'Track Title'
      });
    }

    const versionCheck = detectExplicitCleanInText(trackVersion);
    if (versionCheck.found) {
      alerts.push({
        type: 'error',
        rule: 'explicit_clean_in_version',
        context: trackContext,
        message: `${trackContext}: Track Version contains "(${versionCheck.type})"`,
        field: 'Track Version'
      });
    }

    // --- Rule: & in Lyricist or Composer ---
    if (detectAmpersandInCredits(lyricist)) {
      alerts.push({
        type: 'warning',
        rule: 'ampersand_in_lyricist',
        context: trackContext,
        message: `${trackContext}: Lyricist contains "&" - compound credits not allowed`,
        field: 'Lyricist'
      });
    }

    if (detectAmpersandInCredits(composer)) {
      alerts.push({
        type: 'warning',
        rule: 'ampersand_in_composer',
        context: trackContext,
        message: `${trackContext}: Composer contains "&" - compound credits not allowed`,
        field: 'Composer'
      });
    }

    // --- Rule: Mixed alphabets in title ---
    const titleAlphabets = detectMixedAlphabets(trackTitle);
    if (titleAlphabets.hasMixed) {
      alerts.push({
        type: 'warning',
        rule: 'mixed_alphabets_title',
        context: trackContext,
        message: `${trackContext}: Title contains mixed alphabets (${titleAlphabets.scripts.join(', ')}) - possible side-by-side translation`,
        field: 'Track Title'
      });
    }

    // --- Rule: Emojis in metadata ---
    // Check title
    const titleEmojis = detectEmojis(trackTitle);
    if (titleEmojis.hasEmojis) {
      alerts.push({
        type: 'warning',
        rule: 'emoji_in_title',
        context: trackContext,
        message: `${trackContext}: Title contains emojis (${titleEmojis.emojis.join(' ')})`,
        field: 'Track Title'
      });
    }

    // Check version
    const versionEmojis = detectEmojis(trackVersion);
    if (versionEmojis.hasEmojis) {
      alerts.push({
        type: 'warning',
        rule: 'emoji_in_version',
        context: trackContext,
        message: `${trackContext}: Track Version contains emojis (${versionEmojis.emojis.join(' ')})`,
        field: 'Track Version'
      });
    }

    // --- Rule: Clean without Explicit version ---
    const isClean = explicitStatus.toLowerCase() === 'clean' || explicitStatus.toLowerCase() === 'cleaned';
    if (isClean) {
      alerts.push({
        type: 'info',
        rule: 'clean_version_check',
        context: trackContext,
        message: `${trackContext}: Marked as Clean - verify Explicit version was previously distributed`,
        field: 'Explicit'
      });
    }

    // --- Check emojis and alphabets in artists ---
    Object.entries(artists).forEach(([role, value]) => {
      if (!value || value === '-') return;

      const artistEmojis = detectEmojis(value);
      if (artistEmojis.hasEmojis) {
        alerts.push({
          type: 'warning',
          rule: 'emoji_in_artist',
          context: trackContext,
          message: `${trackContext}: ${role} contains emojis (${artistEmojis.emojis.join(' ')})`,
          field: role
        });
      }

      const artistAlphabets = detectMixedAlphabets(value);
      if (artistAlphabets.hasMixed) {
        alerts.push({
          type: 'warning',
          rule: 'mixed_alphabets_artist',
          context: trackContext,
          message: `${trackContext}: ${role} contains mixed alphabets (${artistAlphabets.scripts.join(', ')})`,
          field: role
        });
      }
    });
  });

  // ===== RELEASE-LEVEL VALIDATIONS =====
  const releaseTitle = releaseData.title || '';
  const basicArtists = releaseData.basicInfo?.Artists || {};

  // --- Release title: mixed alphabets ---
  const releaseTitleAlphabets = detectMixedAlphabets(releaseTitle);
  if (releaseTitleAlphabets.hasMixed) {
    alerts.push({
      type: 'warning',
      rule: 'mixed_alphabets_release_title',
      context: 'Release',
      message: `Release Title contains mixed alphabets (${releaseTitleAlphabets.scripts.join(', ')}) - possible side-by-side translation`,
      field: 'Release Title'
    });
  }

  // --- Release title: emojis ---
  const releaseTitleEmojis = detectEmojis(releaseTitle);
  if (releaseTitleEmojis.hasEmojis) {
    alerts.push({
      type: 'warning',
      rule: 'emoji_in_release_title',
      context: 'Release',
      message: `Release Title contains emojis (${releaseTitleEmojis.emojis.join(' ')})`,
      field: 'Release Title'
    });
  }

  // --- Release title: (Explicit) or (Clean) ---
  const releaseTitleCheck = detectExplicitCleanInText(releaseTitle);
  if (releaseTitleCheck.found) {
    alerts.push({
      type: 'error',
      rule: 'explicit_clean_in_release_title',
      context: 'Release',
      message: `Release Title contains "(${releaseTitleCheck.type})" - use Explicit field instead`,
      field: 'Release Title'
    });
  }

  // --- Basic Artists: & in Lyricist/Composer ---
  if (detectAmpersandInCredits(basicArtists['Lyricist'])) {
    alerts.push({
      type: 'warning',
      rule: 'ampersand_in_release_lyricist',
      context: 'Release',
      message: `Release Lyricist contains "&" - compound credits not allowed`,
      field: 'Lyricist'
    });
  }

  if (detectAmpersandInCredits(basicArtists['Composer'])) {
    alerts.push({
      type: 'warning',
      rule: 'ampersand_in_release_composer',
      context: 'Release',
      message: `Release Composer contains "&" - compound credits not allowed`,
      field: 'Composer'
    });
  }

  // --- Basic Artists: emojis and alphabets ---
  // Exclude non-artist fields that might be captured (C Line, P Line, etc.)
  const nonArtistFields = ['C Line', 'P Line', 'Label', 'UPC', 'ISRC', 'Territories', 'Language', 'Genre', 'Version'];

  Object.entries(basicArtists).forEach(([role, value]) => {
    if (!value || value === '-') return;
    // Skip non-artist fields
    if (nonArtistFields.some(f => role.toLowerCase().includes(f.toLowerCase()))) return;

    const artistEmojis = detectEmojis(value);
    if (artistEmojis.hasEmojis) {
      alerts.push({
        type: 'warning',
        rule: 'emoji_in_release_artist',
        context: 'Release',
        message: `Release ${role} contains emojis (${artistEmojis.emojis.join(' ')})`,
        field: role
      });
    }

    const artistAlphabets = detectMixedAlphabets(value);
    if (artistAlphabets.hasMixed) {
      alerts.push({
        type: 'warning',
        rule: 'mixed_alphabets_release_artist',
        context: 'Release',
        message: `Release ${role} contains mixed alphabets (${artistAlphabets.scripts.join(', ')})`,
        field: role
      });
    }
  });

  return alerts;
}

// =====================================================
// FIN VALIDACIONES DE METADATA
// =====================================================

// NUEVO: Función para normalizar identificadores de tracks y evitar duplicaciones
function normalizeTrackIdentifier(trackTitle, trackNumber) {
  if (!trackTitle) return `Track ${trackNumber}`;
  
  // Remover numeración del inicio del título
  const cleanTitle = trackTitle.replace(/^\s*\d+[).\-:]\s*/, '').trim();
  
  // Si después de limpiar queda vacío, usar el título original
  const finalTitle = cleanTitle || trackTitle;
  
  // Formato consistente: "Track N: Título"
  return `Track ${trackNumber}: ${finalTitle}`;
}

// Variable global para almacenar el estado actual
let currentState = {
  flags: {},
  releaseData: {},
  audioMatchTracks: [],
  explicitFound: false,
  zendeskInfo: null,
  previouslyRejected: false,
  potentialMashups: [],
  suspiciousEmailDomain: null,
  spotifyTracks: [], // NUEVO: almacenar tracks de Spotify cuando lleguen
  audioAnalysisResults: [], // NUEVO: almacenar resultados del análisis de audio
  backofficeHistory: null, // Historial del usuario en backoffice
  curatedArtistHistory: [] // Historial de artistas curados por este usuario
};

// MODIFICADO: Función principal de update mejorada
function updateUI(newData) {
  currentState = { ...currentState, ...newData };

  console.log('Drawer updateUI recibió:', currentState);

  currentState.potentialMashups = checkLooseXInTitles(currentState.releaseData);
  currentState.suspiciousEmailDomain = checkSuspiciousEmailDomain(currentState.releaseData);

  // Send flags to content.js for action button validation
  sendFlagsToContentScript();

  const loading = document.getElementById('loading');
  const results = document.getElementById('qc-results');
  if (loading) loading.style.display = 'none';
  if (!results) return;
  results.style.display = 'block';

  // MODIFICADO: Renderizar inmediatamente sin esperar Spotify
  try {
  renderFullUI();
    
    // NUEVO: Cargar Spotify de forma asíncrona sin bloquear
    if (window.__spotifyTopTracksPromise) {
      window.__spotifyTopTracksPromise
        .then(tracks => {
          if (tracks && tracks.length > 0) {
            currentState.spotifyTracks = tracks;
            // Re-renderizar solo la sección de Spotify si hay matches
            updateSpotifySection();
          }
        })
        .catch(() => {
          console.log('Could not load Spotify tracks, continuing without them');
        });
    }
    
    // MODIFICADO: Ejecutar análisis de audio siempre automáticamente
    const tracksWithAlerts = currentState.releaseData?.trackSections?.filter(track => track.hasAlert) || [];
    if (tracksWithAlerts.length > 0 && (!currentState.audioAnalysisResults || currentState.audioAnalysisResults.length === 0)) {
      console.log('Audio Analysis siempre activado, iniciando análisis automático...');
      startAudioAnalysis();
    }
  } catch (e) {
    console.error('QC Drawer render error:', e);
    if (results) {
      results.style.display = 'block';
      results.innerHTML = '<div style="color:#ef4444;padding:10px;">An unexpected error occurred while rendering.</div>';
    }
  }
}

// NUEVO: Función para actualizar solo la sección de Spotify
function updateSpotifySection() {
  const { releaseData, spotifyTracks } = currentState;
  if (!spotifyTracks || !spotifyTracks.length) return;
  
  // Buscar matches
  const rel = findTitleMatch(releaseData.title, spotifyTracks);
  const trackMatches = releaseData.trackSections
    .map((t) => ({ 
      track: t.header, 
      match: findTitleMatch(t.header, spotifyTracks), 
      displayNumber: t.displayNumber || 'Unknown'
    }))
    .filter(x => x.match);
  
  // Si no hay matches, no hacer nada
  if (!rel && trackMatches.length === 0) return;
  
  // Actualizar la tabla si existe
  const existingSection = document.querySelector('#spotify-section-placeholder');
  if (existingSection && (rel || trackMatches.length > 0)) {
    let html = renderSectionHeader('Top Songs Matches');
    
    if (rel) {
      const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${rel.track} ${rel.artist}`)}`;
      html += renderRow('Release Title', 
        `<a href="${rel.url}" target="_blank" style="color:#1db954;font-weight:600;">
          🎵 "${escapeHTML(rel.track)}" by ${escapeHTML(rel.artist)}
        </a>
        &nbsp; <a href="${yt}" target="_blank" title="Search on YouTube">▶️</a>`
      );
    }
    
    trackMatches.forEach(tm => {
      const yt2 = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${tm.match.track} ${tm.match.artist}`)}`;
      html += renderRow(`Track "${tm.track}"`, 
        `<a href="${tm.match.url}" target="_blank" style="color:#1db954;">
          🎵 "${escapeHTML(tm.match.track)}" by ${escapeHTML(tm.match.artist)}
        </a>
        &nbsp; <a href="${yt2}" target="_blank" title="Search on YouTube">▶️</a>`
      );
    });
    
    existingSection.innerHTML = html;
  }
  
  // También actualizar el summary si es necesario
  updateSpotifySummaryItems();
}

// NUEVO: Actualizar items del summary relacionados con Spotify
function updateSpotifySummaryItems() {
  // Esta función actualizaría el summary, pero es compleja
  // Por simplicidad, podrías forzar un re-render completo
  // O implementar una actualización específica del DOM
  
  // Por ahora, simplemente re-renderizar todo
  renderFullUI();
}

// MODIFICADO: Función de render principal sin dependencia de Spotify
function renderFullUI() {
  const { flags, releaseData, audioMatchTracks, explicitFound, 
          zendeskInfo, previouslyRejected, potentialMashups, suspiciousEmailDomain, 
          tenantInfo, spotifyTracks, audioAnalysisResults } = currentState;
  const results = document.getElementById('qc-results');
  
  const oldSummary = document.getElementById('qc-summary');
  if (oldSummary) oldSummary.remove();
  
  let zendeskSearching = '';
  if (zendeskInfo && zendeskInfo.status === 'searching') {
    zendeskSearching = `<div style="background:#3b82f6;color:#fff;padding:6px 12px;border-radius:6px;margin-top:12px;font-size:0.875rem;display:inline-flex;align-items:center;gap:8px;">
      <div class="qc-spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff;"></div>
      Searching Zendesk tickets...
    </div>`;
  }

  const divLoading = document.createElement('div'); 
  divLoading.id = 'qc-summary';
  divLoading.innerHTML = `<div id="qc-summary-title">👀 QC Checks</div>
    <div class="qc-summary-item" style="color:#fff;padding:6px 0;">
      <span>Analyzing release...</span>
    </div>
    ${zendeskSearching}`;
  results.innerHTML = '';
  results.appendChild(divLoading);

  // MODIFICADO: Renderizar TODO inmediatamente, Spotify es opcional
  
  // Tenant Info
  let tenantHtml = '';
  if (tenantInfo) {
    const considerationText = tenantInfo.consideration ? tenantInfo.consideration : '-';
    tenantHtml += '<table class="qc-full-table">';
    tenantHtml += renderSectionHeader('Tenant Info');
    tenantHtml += renderRow('Tenant', escapeHTML(tenantInfo.tenant || '-'));
    if (tenantInfo.qcApproach) {
      const ap = tenantInfo.qcApproach;
      const pill = `<span class="qc-approach-pill" tabindex="0" data-tooltip="${escapeHTML(ap.message)}" aria-label="${escapeHTML(ap.message)}" style="display:inline-block;padding:4px 8px;border-radius:6px;border:1px solid #ddd;background:${ap.color};font-weight:600;color:#333;cursor:help;">${escapeHTML(ap.label)}</span>`;
      tenantHtml += renderRow('QC Approach', pill);
    }
    tenantHtml += renderRow('Considerations', escapeHTML(considerationText));
    tenantHtml += '</table>';
  }

  // Clean mode is always active - no toggle needed
  const isCleanMode = true;
  const isCleanMode2 = true;
  const invalidCredits = findInvalidCreditNames(releaseData);

  // MEJORADO: Audio Analysis Results (SIEMPRE VISIBLE - después de Tenant Info)
  let audioAnalysisHtml = '';
  console.log('=== GENERANDO SECCIÓN AUDIO ANALYSIS ===');
  console.log('audioAnalysisResults:', audioAnalysisResults);
  console.log('audioAnalysisResults.length:', audioAnalysisResults?.length);
  
  if (audioAnalysisResults && audioAnalysisResults.length > 0) {
    console.log(`Generando tabla para ${audioAnalysisResults.length} tracks con análisis de audio`);
    audioAnalysisHtml += '<table class="qc-full-table">';
    audioAnalysisHtml += renderSectionHeader('Audio Analysis Results');
    
    audioAnalysisResults.forEach(analysis => {
      const trackTitle = analysis.trackTitle || 'Unknown Track';
      const trackNum = trackTitle.match(/^(\d+)\./) ? trackTitle.match(/^(\d+)\./)[1] : '?';
      
      console.log(`Procesando análisis para track ${trackNum}:`, analysis);
      
      // NUEVO: Verificar results en lugar de fragments
      if (analysis.results && analysis.results.length > 0) {
        console.log(`Track ${trackNum} tiene ${analysis.results.length} results`);
        
        // Crear tabla para este track
        // Quitar numeración del título para mostrar solo el nombre real
        const cleanTrackTitle = trackTitle.replace(/^\d+\.\s*/, '');
        
        // Extraer artista del track usando el selector CSS específico
        let trackArtist = '—';
        try {
          // NUEVO: Usar los datos extraídos desde el content script
          if (analysis.trackArtist && analysis.trackArtist !== '—') {
            trackArtist = analysis.trackArtist;
          } else {
            // Fallback: intentar extraer del título del track
            trackArtist = extractTrackArtist(trackTitle);
          }
        } catch (error) {
          console.warn(`Error extracting artist for track ${trackNum}:`, error);
          // Fallback: intentar extraer del título del track
          trackArtist = extractTrackArtist(trackTitle);
        }
        
        // Extraer álbum del título principal de la página
        let trackAlbum = '—';
        try {
          // NUEVO: Usar los datos extraídos desde el content script
          if (analysis.trackAlbum && analysis.trackAlbum !== '—') {
            trackAlbum = analysis.trackAlbum;
          } else {
            // Fallback: intentar extraer del título del track
            trackAlbum = trackTitle.replace(/^\d+\.\s*/, '');
          }
        } catch (error) {
          console.warn('Error extracting album:', error);
          // Fallback: intentar extraer del título del track
          trackAlbum = trackTitle.replace(/^\d+\.\s*/, '');
        }
        
        let tableHtml = `<div class="qc-audio-table-container">
          <div class="qc-audio-table-header">Track ${trackNum}: ${escapeHTML(cleanTrackTitle)}</div>
          <table class="qc-audio-table">
            <thead>
              <tr>
                <th>Result</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Score</th>
                <th>Alerts</th>
              </tr>
            </thead>
            <tbody>
              <!-- Track info row for easy comparison -->
              <tr class="qc-audio-track-info-row">
                <td></td>
                <td><strong>${escapeHTML(cleanTrackTitle)}</strong></td>
                <td><strong>${escapeHTML(trackArtist)}</strong></td>
                <td><strong>${escapeHTML(trackAlbum)}</strong></td>
                <td></td>
                <td></td>
              </tr>`;
        
        // NUEVO: Mostrar todos los results individuales sin agrupar por fragmentos
        if (analysis.results && analysis.results.length > 0) {
          console.log(`Generando tabla para track ${trackNum} con ${analysis.results.length} results:`, analysis.results);
          
          analysis.results.forEach((result, resultIndex) => {
            console.log(`Procesando result ${resultIndex + 1}:`, result);
            
            // Generar alertas para este result
            const alerts = analyzeFragmentAlerts(result, trackTitle);
            const hasAlerts = alerts && alerts.length > 0;
            
            console.log(`Alertas generadas para result ${resultIndex + 1}:`, alerts);
            
            let alertsHtml = '—';
            if (hasAlerts) {
              // Manejar alertas estructuradas (con message y type) y alertas simples (strings)
              alertsHtml = alerts.map(alert => {
                if (typeof alert === 'string') {
                  // Alerta simple (string)
                  return `<div class="qc-alert-line">${escapeHTML(alert)}</div>`;
                } else if (alert.message) {
                  // Alerta estructurada (objeto con message y type)
                  return `<div class="qc-alert-line qc-alert-${alert.type || 'default'}">${escapeHTML(alert.message)}</div>`;
                } else {
                  // Fallback para otros formatos
                  return `<div class="qc-alert-line">${escapeHTML(String(alert))}</div>`;
                }
              }).join('');
            }
            
            const rowClass = hasAlerts ? 'qc-audio-row-alert' : 'qc-audio-row-normal';
            
            // Crear icono de YouTube para buscar título + artista
            const searchQuery = `${result.title || ''} ${result.artists?.join(' ') || ''}`.trim();
            const youtubeIcon = searchQuery ? 
              `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}" target="_blank" class="qc-youtube-search" title="Buscar '${searchQuery}' en YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>` : '—';
            
            const resultRow = `<tr class="${rowClass}">
              <td class="qc-youtube-cell">${youtubeIcon}</td>
              <td>${escapeHTML(result.title || '—')}</td>
              <td>${escapeHTML(result.artists?.join(', ') || '—')}</td>
              <td>${escapeHTML(result.album || '—')}</td>
              <td class="qc-audio-score">${result.score || 0}%</td>
              <td class="qc-audio-alerts">${alertsHtml}</td>
            </tr>`;
            
            console.log(`HTML generado para result ${resultIndex + 1}:`, resultRow);
            tableHtml += resultRow;
          });
        } else {
          console.log(`No se encontraron results para track ${trackNum}:`, analysis);
          // Si no hay results, mostrar mensaje
          tableHtml += `<tr class="qc-audio-row-normal">
            <td colspan="6" style="text-align: center; color: #6b7280; font-style: italic;">
              No se encontraron resultados de audio analysis
            </td>
          </tr>`;
        }
        
        console.log(`HTML final de la tabla para track ${trackNum}:`, tableHtml);
        
        tableHtml += `</tbody></table></div>`;
        // Usar toda la fila para la tabla sin columna izquierda
        audioAnalysisHtml += `<tr><td colspan="2" class="qc-audio-full-width">${tableHtml}</td></tr>`;
        console.log(`Tabla generada para track ${trackNum} y agregada al HTML`);
      } else {
        console.log(`Track ${trackNum} no tiene results válidos:`, analysis);
      }
    });
    
    audioAnalysisHtml += '</table>';
    console.log('Sección de Audio Analysis generada exitosamente');
  } else {
    console.log('No hay resultados de audio analysis para mostrar');
  }
  
  console.log('HTML final de Audio Analysis:', audioAnalysisHtml);

  let html = tenantHtml + audioAnalysisHtml + `<div id="qc-full-details" style="${isCleanMode ? 'display:none;' : ''}">` + '<table class="qc-full-table">';
      html += renderSectionHeader('Release');
      html += renderRow('Title', escapeHTML(releaseData.title || '-'));
  html += `<tr><td colspan="2"><span id="spotify-release-match">" "</span></td></tr>`;

      // Cover art
      const imgHtml = renderCover(releaseData.coverUrl);
      if (releaseData.coverUrl) {
        const urlEnc = encodeURIComponent(releaseData.coverUrl);
        const yUrl = `https://yandex.com/images/search?rpt=imageview&url=${urlEnc}`;
        html += renderRow('Cover Art', `
          <div class="qc-cover-wrapper">
            ${imgHtml}
            <a href="${yUrl}" target="_blank" class="qc-yandex-search-button">
              ${duckIconSVG()}
            </a>
          </div>
        `);
      } else {
        html += renderRow('Cover Art', imgHtml);
      }
      
      if (previouslyRejected) {
        html += renderRow('Previous Status', '<span style="background:#dc3545;color:#fff;padding:4px 12px;border-radius:6px;font-weight:600;">PREVIOUSLY REJECTED</span>');
      }
      
      // User
      html += renderSectionHeader('User');
      const strikes = releaseData.userStrikes?.length ? releaseData.userStrikes.join(', ') : 'No strikes';
      html += renderRow('Strikes', `<span class="qc-strike">${escapeHTML(strikes)}</span>`);
      html += renderRow('Verification', `<span class="qc-verif-status" style="background:${releaseData.userVerificationColor};color:#fff;padding:2px 8px;border-radius:4px;">${escapeHTML(releaseData.userVerificationStatus)}</span>`);
      
  // Zendesk Tickets
      if (zendeskInfo) {
        let zendeskHtml = '';
        if (zendeskInfo.status === 'searching') {
          zendeskHtml = '<span style="color:#3b82f6;"><div class="qc-spinner" style="width:14px;height:14px;vertical-align:middle;border-width:2px;"></div> Searching...</div>';
        } else if (zendeskInfo.ticketCount === -1) {
          zendeskHtml = '<span class="text-gray">Error loading tickets</span>';
        } else {
          let fraudText = '';
          if (zendeskInfo.fraudTickets !== undefined && zendeskInfo.fraudTickets !== null) { 
            fraudText = ` (${zendeskInfo.fraudTickets} fraud-related)`;
          }
          zendeskHtml = `<span style="background:#ef4444;color:#fff;padding:4px 12px;border-radius:6px;font-weight:600;font-size:0.875rem;display:inline-block;">
            ${zendeskInfo.ticketCount} ticket${zendeskInfo.ticketCount > 1 ? 's' : ''}${fraudText}
          </span>`;
          
          if (zendeskInfo.lastUpdated) {
            zendeskHtml += `<br><span style="font-size:0.75rem;color:#6b7280;margin-left:0px;margin-top:4px;display:inline-block;">
              Last checked: ${new Date(zendeskInfo.lastUpdated).toLocaleTimeString()}
            </span>`;
          }
        }
        html += renderRow('Zendesk Tickets', zendeskHtml);
      } else {
        html += renderRow('Zendesk Tickets', '<span class="text-gray">Not checked</span>');
      }
      
      // Database Check
      html += renderSectionHeader('Database Check');
      html += renderRow('Blacklist Email', renderFlagCell(flags.blacklistEmails));
      html += renderRow('Blacklist Artist', renderFlagCell(flags.blacklistArtists));
      html += renderRow('Blacklist Label', renderFlagCell(flags.blacklistLabels, true));
      html += renderRow('Curated Artist', renderFlagCell(flags.curatedArtists, true));
      html += renderRow('Suspicious Terms', renderFlagCell(flags.terms));
      html += renderRow('Suspicious Email Domain', renderFlagCell(flags.suspiciousEmailDomains));
      
  // MODIFICADO: Spotify section con placeholder
  // Si ya tenemos los datos de Spotify, renderizar
  if (spotifyTracks && spotifyTracks.length > 0) {
    const rel = findTitleMatch(releaseData.title, spotifyTracks);
      const trackMatches = releaseData.trackSections
        .map((t) => ({ 
          track: t.header, 
        match: findTitleMatch(t.header, spotifyTracks), 
          displayNumber: t.displayNumber || 'Unknown'
        }))
        .filter(x => x.match);
      
      if (rel || trackMatches.length > 0) {
      html += `<tbody id="spotify-section-placeholder">`;
        html += renderSectionHeader('Top Songs Matches');
        
        if (rel) {
        const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${rel.track} ${rel.artist}`)}`;
          html += renderRow('Release Title', 
            `<a href="${rel.url}" target="_blank" style="color:#1db954;font-weight:600;">
              🎵 "${escapeHTML(rel.track)}" by ${escapeHTML(rel.artist)}
          </a>
          &nbsp; <a href="${yt}" target="_blank" title="Search on YouTube">▶️</a>`
          );
        }
        
        trackMatches.forEach(tm => {
        const yt2 = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${tm.match.track} ${tm.match.artist}`)}`;
          html += renderRow(`Track "${tm.track}"`, 
            `<a href="${tm.match.url}" target="_blank" style="color:#1db954;">
              🎵 "${escapeHTML(tm.match.track)}" by ${escapeHTML(tm.match.artist)}
          </a>
          &nbsp; <a href="${yt2}" target="_blank" title="Search on YouTube">▶️</a>`
          );
        });
      html += `</tbody>`;
    } else {
      // Placeholder vacío para cuando lleguen los datos
      html += `<tbody id="spotify-section-placeholder"></tbody>`;
    }
  } else {
    // Placeholder para cuando lleguen los datos de Spotify
    html += `<tbody id="spotify-section-placeholder"></tbody>`;
  }
  
        // Audio (removido - ya se muestra en Audio Analysis Results con más detalle)
      

      
      // Clean Mode - Solo secciones minimizables
      if (!isCleanMode2) {
      if (explicitFound) {
        html += renderSectionHeader('Content Rating');
        html += renderRow('Explicit Content', '<span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:4px;">EXPLICIT</span>');
      }

        // Mashups
      if (potentialMashups.length > 0) {
        html += renderSectionHeader('Potential Mashups');
        html += renderRow('Detected "x" in', `<ul class="qc-flag-list">${potentialMashups.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`);
        }
      }
      
      html += '</table>';
  results.querySelector('#qc-summary').insertAdjacentHTML('afterend', html + '</div>');

      // Interacciones UI
      const coverEl = document.getElementById('qc-cover-big');
      if (coverEl) coverEl.onclick = () => coverEl.classList.toggle('qc-expanded');
      results.querySelectorAll('.qc-duck-search').forEach(el => el.onclick = e => { e.preventDefault(); showDuckModal(el.dataset.query); });

      // --- QC Summary ---
      let summaryItems = [];
      
      if (previouslyRejected) {
        summaryItems.push({ msg: 'Release previously rejected', color: 'red', rawMsgKey: 'Release previously rejected' });
      }
      
      const ver = releaseData.basicInfo?.Metadata?.['Version'];
      if (ver && ver !== '-') summaryItems.push({ msg: `Version Tag Detected`, color: 'yellow', rawMsgKey: 'Version', flagValue: [ver], dynamicParams: { version: ver } });
      
  const versionMap = {};
      releaseData.trackSections.forEach((t) => {
        const tv = t.sections.Metadata?.['Version'];
        const trackTitle = t.header || 'Unknown Track';
    if (tv && tv !== '-') {
      const key = (tv || '').toString();
      if (!versionMap[key]) versionMap[key] = [];
      versionMap[key].push(trackTitle);
    }
  });
  Object.entries(versionMap).forEach(([ver, trackTitles]) => {
    const list = trackTitles.join(', ');
    summaryItems.push({ 
      msg: `Track "${list}" Version`, 
      color: 'yellow', 
      rawMsgKey: 'Track Version', 
      flagValue: [ver] // NUEVO: Incluir la versión en flagValue para mostrarla en la columna correcta
    });
  });

      if (invalidCredits.composer.length) {
        summaryItems.push({
          msg: 'Composer must be "name surname"',
          color: 'yellow',
          rawMsgKey: 'Composer format invalid',
          flagValue: invalidCredits.composer,
          flagType: 'invalidCreditComposer'
        });
      }

      if (invalidCredits.lyricist.length) {
        summaryItems.push({
          msg: 'Lyricist must be "name surname"',
          color: 'yellow',
          rawMsgKey: 'Lyricist format invalid',
          flagValue: invalidCredits.lyricist,
          flagType: 'invalidCreditLyricist'
        });
      }

      // ===== VALIDACIONES DE METADATA (QC Rules) =====
      const metadataAlerts = validateMetadataRules(releaseData);
      metadataAlerts.forEach(alert => {
        const color = alert.type === 'error' ? 'red' : (alert.type === 'warning' ? 'yellow' : 'yellow');
        summaryItems.push({
          msg: alert.message,
          color: color,
          rawMsgKey: alert.rule,
          flagValue: [alert.field],
          flagType: `metadata_${alert.rule}`
        });
      });

      // Usar la versión mejorada de warnings (incluye duración robusta)
      showWarningsV2(releaseData).forEach(w => summaryItems.push(w));
      if (releaseData.userStrikes?.length) summaryItems.push({ msg: 'User has Strikes', color: 'red', rawMsgKey: 'User has Strikes', flagType: 'userStrikes' });
      if (releaseData.userVerificationStatus !== 'VERIFIED') summaryItems.push({ msg: 'User not verified', color: 'yellow', rawMsgKey: 'User not verified' });
      
  // Añadir estado de Zendesk al summary: mostrar "buscando" mientras carga para evitar parpadeos
  if (zendeskInfo && zendeskInfo.status === 'searching') {
    summaryItems.push({
      msg: 'Zendesk tickets: searching…',
      color: 'yellow',
      rawMsgKey: 'User has Zendesk ticket(s)'
    });
  } else if (zendeskInfo && zendeskInfo.status !== 'searching') {
        if (zendeskInfo.ticketCount > 0) {
          let fraudSummaryText = '';
          if (zendeskInfo.fraudTickets !== undefined && zendeskInfo.fraudTickets !== null) {
            fraudSummaryText = ` (${zendeskInfo.fraudTickets} fraud-related)`;
          }
          summaryItems.push({
            msg: `User has Zendesk ticket(s)`,
            color: 'red',
            rawMsgKey: 'User has Zendesk ticket(s)',
            flagValue: [`${zendeskInfo.ticketCount} ticket${zendeskInfo.ticketCount > 1 ? 's' : ''}${fraudSummaryText}`],
            dynamicParams: { ticketCount: zendeskInfo.ticketCount, fraudTickets: zendeskInfo.fraudTickets }
          });
        }
      }

      // ===== BACKOFFICE HISTORY ALERTS =====
      const backofficeHistory = currentState.backofficeHistory;
      const curatedArtistHistory = currentState.curatedArtistHistory || [];

      // Note: backofficeHistory is now rendered as a separate visual section, not in summaryItems
      // We only add a red alert if there are rejected releases (this goes in the QC Checks)
      if (backofficeHistory && backofficeHistory.summary) {
        const summary = backofficeHistory.summary;
        // Alert for rejected releases - this is important enough to show in QC Checks
        if (summary.rejected && summary.rejected.length > 0) {
          const rejectedCount = summary.rejected.length;
          // Build detailed rejected info with reasons
          const rejectedDetails = summary.rejected.slice(0, 5).map(r => {
            let detail = `"${r.title}"`;
            if (r.rejectReasons && r.rejectReasons.length > 0) {
              // Show first 2 reasons max to keep it concise
              const reasonsPreview = r.rejectReasons.slice(0, 2).join('; ');
              const moreReasons = r.rejectReasons.length > 2 ? ` (+${r.rejectReasons.length - 2} more)` : '';
              detail += `: ${reasonsPreview}${moreReasons}`;
            }
            return detail;
          });
          summaryItems.push({
            msg: `User has ${rejectedCount} rejected release${rejectedCount > 1 ? 's' : ''}`,
            color: 'red',
            rawMsgKey: 'user_has_rejected_releases',
            flagValue: rejectedDetails,
            dynamicParams: { count: rejectedCount }
          });
        }
      }

      // Alert for curated artists with history by same user
      if (curatedArtistHistory && curatedArtistHistory.length > 0) {
        curatedArtistHistory.forEach(artistData => {
          if (artistData.total > 0) {
            const statusStr = Object.entries(artistData.statusCounts)
              .map(([status, count]) => `${count} ${status.replace(/_/g, ' ')}`)
              .join(', ');
            summaryItems.push({
              msg: `Curated artist "${artistData.artistName}" has ${artistData.total} release${artistData.total > 1 ? 's' : ''} by this user`,
              color: 'red',
              rawMsgKey: 'curated_artist_user_history',
              flagValue: [statusStr],
              dynamicParams: { artistName: artistData.artistName, total: artistData.total, statusCounts: artistData.statusCounts }
            });
          }
        });
      }
      
      const map = { 
        blacklistEmails: 'Blacklisted Email', 
        blacklistArtists: 'Blacklisted Artist', 
        blacklistLabels: 'Blacklisted Label', 
        curatedArtists: 'Curated Artist', 
        terms: 'Suspicious Term',
        suspiciousEmailDomains: 'Suspicious Email Domain'
      };
      Object.entries(flags).forEach(([k, arr]) => { 
        if (arr?.length) {
          // Evitar duplicar la alerta: ya se añade un item específico para dominio sospechoso más abajo
          if (k === 'suspiciousEmailDomains') return;
          summaryItems.push({ 
            msg: `Match with ${map[k]}`,
            flagType: k,
            rawMsgKey: `Match with ${map[k]}`,
            color: (k === 'terms') ? 'yellow' : 'red' 
          }); 
        }
      });

      if (flags.noTracks) {
        summaryItems.push({ msg: 'No tracks found', color: 'red', rawMsgKey: 'No tracks found' });
      }

      // MODIFICADO: Audio matches consolidado sin duplicaciones
      if (audioMatchTracks.length > 0 || (audioAnalysisResults && audioAnalysisResults.length > 0)) {
        // Crear mapa de tracks únicos por número
        const trackMap = new Map();
        
        // Procesar análisis detallado (priority over basic alerts)
        if (audioAnalysisResults) {
          audioAnalysisResults.forEach(analysis => {
            const trackMatch = analysis.trackTitle ? analysis.trackTitle.match(/^(\d+)\./) : null;
            const trackNum = trackMatch ? parseInt(trackMatch[1], 10) : null;
            
            if (trackNum && analysis.fragments && analysis.fragments.some(f => f.alerts && f.alerts.length > 0)) {
              // NUEVO: Usar normalizeTrackIdentifier para consistencia
              const normalizedTitle = normalizeTrackIdentifier(analysis.trackTitle, trackNum);
              
              // Contar alertas por tipo (incluyendo las nuevas categorías)
              let score100Count = 0, titleSimilarCount = 0, titleModeratelySimilarCount = 0, titleDiffCount = 0;
              let artistSimilarCount = 0, artistModeratelySimilarCount = 0, artistsDiffCount = 0, additionalArtistsCount = 0;
              
              analysis.fragments.forEach(fragment => {
                if (fragment.alerts && fragment.alerts.length > 0) {
                  fragment.alerts.forEach(alert => {
                    if (alert.type === 'score_100') score100Count++;
                    else if (alert.type === 'title_similar') titleSimilarCount++;
                    else if (alert.type === 'title_moderately_similar') titleModeratelySimilarCount++;
                    else if (alert.type === 'title_different') titleDiffCount++;
                    else if (alert.type === 'artist_similar') artistSimilarCount++;
                    else if (alert.type === 'artist_moderately_similar') artistModeratelySimilarCount++;
                    else if (alert.type === 'artists_different') artistsDiffCount++;
                    else if (alert.type === 'additional_artists') additionalArtistsCount++;
                  });
                }
              });
              
              // Crear un resumen consolidado para este track
              const trackAlerts = [];
              let hasRedAlert = false;
              
              if (score100Count > 0) {
                trackAlerts.push(`${score100Count} 100% match${score100Count > 1 ? 'es' : ''}`);
                hasRedAlert = true;
              }
              
              if (titleSimilarCount > 0) {
                trackAlerts.push(`${titleSimilarCount} very similar title${titleSimilarCount > 1 ? 's' : ''}`);
              }
              
              if (titleModeratelySimilarCount > 0) {
                trackAlerts.push(`${titleModeratelySimilarCount} moderately similar title${titleModeratelySimilarCount > 1 ? 's' : ''}`);
              }
              
              if (titleDiffCount > 0) {
                trackAlerts.push(`${titleDiffCount} different title${titleDiffCount > 1 ? 's' : ''}`);
              }
              
              if (artistSimilarCount > 0) {
                trackAlerts.push(`${artistSimilarCount} very similar artist${artistSimilarCount > 1 ? 's' : ''}`);
              }
              
              if (artistModeratelySimilarCount > 0) {
                trackAlerts.push(`${artistModeratelySimilarCount} moderately similar artist${artistModeratelySimilarCount > 1 ? 's' : ''}`);
              }
              
              if (artistsDiffCount > 0) {
                trackAlerts.push(`${artistsDiffCount} different artist${artistsDiffCount > 1 ? 's' : ''}`);
              }
              
              if (additionalArtistsCount > 0) {
                trackAlerts.push(`${additionalArtistsCount} additional artist${additionalArtistsCount > 1 ? 's' : ''}`);
              }
              
              // Solo agregar al mapa si hay alertas
              if (trackAlerts.length > 0) {
                trackMap.set(trackNum, {
                  trackNumber: trackNum,
                  trackTitle: normalizedTitle,
                  alerts: trackAlerts,
                  hasRedAlert: hasRedAlert,
                  totalMatches: score100Count + titleSimilarCount + titleModeratelySimilarCount + titleDiffCount + 
                               artistSimilarCount + artistModeratelySimilarCount + artistsDiffCount + additionalArtistsCount
                });
              }
            }
          });
        }
        
        // Procesar tracks básicos con alerts (solo si no están ya en el mapa)
        audioMatchTracks.forEach(trackRef => {
          // trackRef puede ser número o string como "Track 1: Title"
          let trackNum;
          if (typeof trackRef === 'number') {
            trackNum = trackRef;
          } else {
            const match = String(trackRef).match(/Track\s+(\d+)/i);
            trackNum = match ? parseInt(match[1], 10) : null;
          }
          
          if (trackNum && !trackMap.has(trackNum)) {
            // NUEVO: Obtener alertas específicas de audio analysis para este track
            let trackAlerts = [];
            // NUEVO: Obtener el título real del track desde releaseData
            let trackTitle = `Track ${trackNum}`; // Fallback
            if (currentState.releaseData?.trackSections) {
              const trackSection = currentState.releaseData.trackSections.find(t => t.displayNumber === trackNum);
              if (trackSection && trackSection.header) {
                trackTitle = trackSection.header;
              }
            }
            console.log(`Procesando track ${trackNum} para alertas de audio analysis`);
            console.log('Estado actual:', currentState);
            
            if (currentState.audioAnalysisResults && currentState.audioAnalysisResults.length > 0) {
              console.log(`Audio analysis results disponibles:`, currentState.audioAnalysisResults);
              console.log(`Buscando track ${trackNum} en audio analysis results...`);
              
              // DEBUG: Mostrar todos los trackIndex y trackNumber disponibles
              currentState.audioAnalysisResults.forEach((analysis, idx) => {
                console.log(`Analysis ${idx}: trackIndex=${analysis.trackIndex}, trackNumber=${analysis.trackNumber}, trackTitle=${analysis.trackTitle}`);
              });
              
              // FIXED: Convertir trackNum (1-indexed) a trackIndex (0-indexed)
              const trackAnalysis = currentState.audioAnalysisResults.find(analysis => 
                analysis.trackIndex === (trackNum - 1) || analysis.trackNumber === trackNum
              );
              console.log(`Track analysis encontrado para track ${trackNum} (buscando trackIndex ${trackNum - 1}):`, trackAnalysis);
              
              if (trackAnalysis && trackAnalysis.results) {
                console.log(`Procesando ${trackAnalysis.results.length} results para track ${trackNum}`);
                // MEJORADO: Usar el trackTitle real del análisis en lugar de "Track X"
                trackTitle = trackAnalysis.trackTitle || trackTitle; // NUEVO: Actualizar trackTitle, mantener el valor obtenido anteriormente
                console.log(`Track title para análisis: "${trackTitle}"`);
                console.log(`Track analysis completo:`, trackAnalysis);
                
                // NUEVO: Usar Set para evitar alertas duplicadas
                const uniqueAlerts = new Set();
                
                trackAnalysis.results.forEach(result => {
                  console.log(`Analizando result:`, result);
                  const resultAlerts = analyzeFragmentAlerts(result, trackTitle);
                  console.log(`Alertas generadas para result con trackTitle "${trackTitle}":`, resultAlerts);
                  
                  // Agregar solo alertas únicas
                  resultAlerts.forEach(alert => {
                    uniqueAlerts.add(alert.message);
                  });
                });
                
                // Convertir Set a array para trackAlerts
                trackAlerts = Array.from(uniqueAlerts);
              }
            } else {
              console.log('No hay audio analysis results disponibles en currentState');
            }
            
            console.log(`Alertas finales para track ${trackNum}:`, trackAlerts);
            
            trackMap.set(trackNum, {
              trackNumber: trackNum,
              // MEJORADO: Usar el título real del track cuando esté disponible
              trackTitle: trackTitle, // NUEVO: Usar la variable local trackTitle
              alerts: trackAlerts,
              hasRedAlert: trackAlerts.some(alert => alert.includes('Score 100%')),
              totalMatches: 1
            });
          }
        });
        
        // Convertir el mapa a array de resultados y ordenar por prioridad
        const consolidatedResults = Array.from(trackMap.values())
          .sort((a, b) => {
            // Primero por prioridad (rojo antes que amarillo)
            if (a.hasRedAlert !== b.hasRedAlert) {
              return b.hasRedAlert ? 1 : -1;
            }
            // Luego por número de track
            return a.trackNumber - b.trackNumber;
          });
        
        if (consolidatedResults.length > 0) {
          // Determinar el color general basado en si hay alguna alerta roja
          const hasAnyRedAlert = consolidatedResults.some(track => track.hasRedAlert);
          const generalColor = hasAnyRedAlert ? 'red' : 'yellow';
          
          // Solo mostrar el resumen general, sin detalles por track
          summaryItems.push({
            msg: `Audio matches found in ${consolidatedResults.length} track${consolidatedResults.length > 1 ? 's' : ''}`,
            color: generalColor,
            rawMsgKey: 'Audio matches found',
            dynamicParams: { count: consolidatedResults.length }
          });
        }
      }
      
      // ELIMINADO: Código duplicado que generaba alertas individuales por track
      // Ahora toda la información se consolida en la alerta principal arriba

      if (explicitFound) summaryItems.push({ msg: 'Explicit content detected', color: 'yellow', rawMsgKey: 'Explicit content detected' });

      if (potentialMashups.length > 0) {
        summaryItems.push({ msg: 'Potential mashup detected', color: 'red', flagType: 'potentialMashups', rawMsgKey: 'Potential mashup detected' });
      }

      if (suspiciousEmailDomain) {
        summaryItems.push({ 
          msg: `Suspicious email domain detected`, 
          color: 'yellow', 
          rawMsgKey: 'Suspicious email domain detected',
          flagValue: [suspiciousEmailDomain]
        });
      }

  // MODIFICADO: Spotify en summary solo si ya tenemos los datos
  if (spotifyTracks && spotifyTracks.length > 0) {
    const rel = findTitleMatch(releaseData.title, spotifyTracks);
    const trackMatches = releaseData.trackSections
      .map((t) => ({ 
        track: t.header, 
        match: findTitleMatch(t.header, spotifyTracks), 
        displayNumber: t.displayNumber || 'Unknown'
      }))
      .filter(x => x.match);
    
      if (rel) {
        summaryItems.push({ msg: `Release Title matches top song`, color: 'yellow', rawMsgKey: 'Release Title matches top song', flagValue: [`"${rel.track}" by ${rel.artist}`], dynamicParams: { title: rel.track } });
      }
      if (trackMatches.length > 0) {
          trackMatches.forEach(tm => {
              summaryItems.push({ msg: `Track "${tm.track}" matches top song`, color: 'yellow', rawMsgKey: 'Track matches top song', flagValue: [`"${tm.match.track}" by ${tm.match.artist}`], dynamicParams: { trackNum: tm.displayNumber, title: tm.match.track } });
          });
      }
      }

  // Render summary FINAL
      const groups = { metadata: [], user: [], audio: [] };
      summaryItems.forEach(it => {
        const l = it.msg.toLowerCase();
        // CORREGIDO: "Release previously rejected" debe ir en metadata, no en user
        if (l.includes('release previously rejected')) groups.metadata.push(it);
        else if (l.startsWith('user') || l.includes('zendesk') || l.includes('fraud') || l.includes('email domain') || l.includes('strikes')) groups.user.push(it);
        else if (l.includes('audio') || l.includes('duration') || l.includes('explicit') || l.includes('tracks') || l.includes('mashup')) groups.audio.push(it);
        else groups.metadata.push(it);
      });
      [groups.metadata, groups.user, groups.audio].forEach(arr => arr.sort((a,b) => a.color==='red' ? -1 : 1));
      
      const oldSummary2 = document.getElementById('qc-summary');
      if (oldSummary2) oldSummary2.remove();

      // Remove old user history section if exists
      const oldUserHistory = document.getElementById('qc-user-history');
      if (oldUserHistory) oldUserHistory.remove();

      // ===== USER HISTORY SECTION (visual bars) =====
      let userHistoryHTML = '';
      if (backofficeHistory) {
        if (backofficeHistory.status === 'searching') {
          userHistoryHTML = `
            <div id="qc-user-history" class="qc-user-history-section">
              <div class="qc-user-history-header">
                <span>📊 User History</span>
              </div>
              <div class="qc-user-history-loading">
                <span class="qc-spinner"></span> Searching backoffice...
              </div>
            </div>`;
        } else if (backofficeHistory.summary && backofficeHistory.summary.total > 0) {
          const summary = backofficeHistory.summary;
          const total = summary.total;

          // Define status colors and order (most important first)
          const statusConfig = {
            'rejected': { color: '#ef4444', icon: '🔴', priority: 1 },
            'disapproved': { color: '#ef4444', icon: '🔴', priority: 2 },
            'client action required': { color: '#f59e0b', icon: '🟠', priority: 3 },
            'client documentation required': { color: '#f59e0b', icon: '🟠', priority: 4 },
            'agent action required': { color: '#3b82f6', icon: '🔵', priority: 5 },
            'under review': { color: '#8b5cf6', icon: '🟣', priority: 6 },
            'pending': { color: '#6b7280', icon: '⚪', priority: 7 },
            'approved': { color: '#22c55e', icon: '🟢', priority: 8 }
          };

          // Sort statuses by priority and count
          const sortedStatuses = Object.entries(summary.byStatus)
            .map(([status, count]) => ({
              status,
              count,
              config: statusConfig[status] || { color: '#6b7280', icon: '⚪', priority: 99 }
            }))
            .sort((a, b) => {
              // Sort by priority first, then by count descending
              if (a.config.priority !== b.config.priority) {
                return a.config.priority - b.config.priority;
              }
              return b.count - a.count;
            });

          // Build the bars HTML
          const barsHTML = sortedStatuses.map(({ status, count, config }) => {
            const percentage = Math.round((count / total) * 100);
            const barWidth = Math.max(percentage, 3); // Minimum 3% width for visibility
            const displayStatus = status.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return `
              <div class="qc-history-bar-row">
                <div class="qc-history-bar-label">
                  <span class="qc-history-bar-count">${count}</span>
                  <span class="qc-history-bar-status">${displayStatus}</span>
                </div>
                <div class="qc-history-bar-container">
                  <div class="qc-history-bar" style="width: ${barWidth}%; background-color: ${config.color};"></div>
                </div>
                <span class="qc-history-bar-percent">${percentage}%</span>
              </div>`;
          }).join('');

          userHistoryHTML = `
            <div id="qc-user-history" class="qc-user-history-section">
              <div class="qc-user-history-header">
                <span>📊 User History</span>
                <span class="qc-user-history-total">${total} release${total > 1 ? 's' : ''}</span>
              </div>
              <div class="qc-user-history-bars">
                ${barsHTML}
              </div>
            </div>`;
        }
      }

  const div = document.createElement('div');
  div.id = 'qc-summary';

  // Insert user history section before QC Checks if we have data
  div.innerHTML = userHistoryHTML + `<div id="qc-summary-title" class="qc-summary-header">
    <span>👀 QC Checks</span>
  </div>`;
  
      const anyAlerts = Object.values(groups).some(a => a.length);
      if (!anyAlerts) {
        div.innerHTML += `<table class="qc-alerts-table">
          <thead>
            <tr>
              <th>Alerta</th>
              <th>Dato</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="3" style="text-align:center; padding:16px; color:var(--qc-accent-green);">
                ✅ No Alerts Found
              </td>
            </tr>
          </tbody>
        </table>`;
      } else {
        // Build table with new 3-column format
        let tableHTML = '';
        Object.entries(groups).forEach(([groupName, alerts]) => {
          if (!alerts.length) return;

          tableHTML += `<div class="qc-summary-group-title">${escapeHTML(groupName.charAt(0).toUpperCase() + groupName.slice(1))}</div>`;
          tableHTML += `<table class="qc-alerts-table">
            <thead>
              <tr>
                <th>Alerta</th>
                <th>Dato</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>`;

          alerts.forEach(it => {
            // Get flag items for the "Dato" column
            let flagItems = [];
            if (it.flagValue) {
              flagItems = it.flagValue;
            } else if (it.flagType) {
              switch (it.flagType) {
                case 'invalidCreditComposer':
                  flagItems = invalidCredits.composer;
                  break;
                case 'invalidCreditLyricist':
                  flagItems = invalidCredits.lyricist;
                  break;
                case 'potentialMashups':
                  flagItems = potentialMashups;
                  break;
                case 'audioMatchTracks':
                  flagItems = audioMatchTracks;
                  break;
                case 'userStrikes':
                  flagItems = releaseData.userStrikes;
                  break;
                default:
                  if (flags[it.flagType]) {
                    flagItems = flags[it.flagType];
                  }
                  break;
              }
            }

            // Build "Dato" column content
            let dataContent = '';
            if (flagItems && flagItems.length > 0) {
              if (it.detailedAudioResults) {
                // Audio results with track details
                dataContent = flagItems.map(trackResult => {
                  const trackTitle = trackResult.trackTitle || trackResult.title || 'Unknown Track';
                  return `<span class="qc-alert-data">${escapeHTML(trackTitle)}</span>`;
                }).join('<br>');
              } else if (it.flagType === 'invalidCreditComposer' || it.flagType === 'invalidCreditLyricist') {
                // Credit validation entries
                dataContent = flagItems.map(entry => {
                  const name = entry?.name || String(entry || '');
                  return `<span class="qc-alert-data">${escapeHTML(name)}</span>`;
                }).join('<br>');
              } else {
                // Normal items
                dataContent = flagItems.map(item =>
                  `<span class="qc-alert-data">${escapeHTML(String(item))}</span>`
                ).join('<br>');
              }
            } else {
              dataContent = '<span style="color:var(--qc-text-muted);">-</span>';
            }

            // Build "Detalle" column content
            let detailContent = '';
            if (it.detailedAudioResults && flagItems && flagItems.length > 0) {
              // Show track details for audio results
              detailContent = flagItems.map(trackResult => {
                const trackDetails = trackResult.alerts || trackResult.details || [];
                return trackDetails.length > 0
                  ? trackDetails.map(d => escapeHTML(d)).join(', ')
                  : '<span style="color:var(--qc-text-muted);">-</span>';
              }).join('<br>');
            } else if ((it.flagType === 'invalidCreditComposer' || it.flagType === 'invalidCreditLyricist') && flagItems && flagItems.length > 0) {
              // Show contexts for credit validation
              detailContent = flagItems.map(entry => {
                const contexts = Array.isArray(entry?.contexts) ? entry.contexts : [];
                return contexts.length > 0
                  ? contexts.map(ctx => escapeHTML(ctx)).join(', ')
                  : '<span style="color:var(--qc-text-muted);">-</span>';
              }).join('<br>');
            } else {
              // Use validation description as detail
              const validationInfo = validationDetails[it.rawMsgKey];
              if (validationInfo) {
                let desc = validationInfo.description;
                if (typeof desc === 'function') {
                  // Try to call with dynamic params
                  const params = it.dynamicParams || {};
                  try {
                    desc = desc(params.trackTitle || params.title || '', params.count || flagItems?.length || 0, params);
                  } catch(e) {
                    desc = 'See help for details';
                  }
                }
                // Truncate long descriptions
                if (desc && desc.length > 80) {
                  desc = desc.substring(0, 77) + '...';
                }
                detailContent = `<span class="qc-alert-detail">${escapeHTML(desc || '-')}</span>`;
              } else {
                detailContent = '<span style="color:var(--qc-text-muted);">-</span>';
              }
            }

            tableHTML += `<tr data-rawkey="${escapeHTML(it.rawMsgKey)}" data-flag="${escapeHTML(it.flagType || '')}">
              <td>
                <div class="qc-alert-cell">
                  <span class="qc-alert-icon">${it.color === 'red' ? '🔴' : '🟡'}</span>
                  <span class="qc-alert-text">${escapeHTML(it.msg)}</span>
                  <button class="qc-help-button" data-alert-key="${escapeHTML(it.rawMsgKey)}" data-params='${JSON.stringify(it.dynamicParams || {})}' title="More info">
                    ${questionMarkSVG()}
                  </button>
                </div>
              </td>
              <td>${dataContent}</td>
              <td>${detailContent}</td>
            </tr>`;
          });

          tableHTML += `</tbody></table>`;
        });

        div.innerHTML += tableHTML;
      }

      // LEGACY COMPATIBILITY: Keep qc-grid-item references working
      div.querySelectorAll('.qc-alerts-table tbody tr').forEach(row => {
        row.classList.add('qc-grid-item');
      });

      results.prepend(div);

  // Añadir botones DuckDuckGo/YouTube en el resumen (NEW TABLE FORMAT)
  try {
    // Helper function to add search icons to table data cells
    const addIconsToTableRow = (row, includeDuck = true, includeYouTube = false) => {
      // Find the second column (Dato) which contains the data
      const dataCell = row.querySelector('td:nth-child(2)');
      if (!dataCell) return;

      // Get all qc-alert-data spans in the data column
      const dataSpans = dataCell.querySelectorAll('.qc-alert-data');
      dataSpans.forEach(span => {
        const q = span.textContent.trim();
        if (!q) return;

        // Create icon container if not exists
        let iconCol = span.parentElement.querySelector('.qc-icon-col');
        if (!iconCol) {
          iconCol = document.createElement('span');
          iconCol.className = 'qc-icon-col';
          iconCol.style.cssText = 'display:inline-flex; align-items:center; gap:4px; margin-left:6px;';
          span.parentElement.insertBefore(iconCol, span.nextSibling);
        }

        if (includeDuck) {
          const duck = document.createElement('a');
          duck.href = '#';
          duck.className = 'qc-inline-icon qc-duck-inline';
          duck.title = 'Search in DuckDuckGo';
          duck.innerHTML = duckIconSVG();
          duck.onclick = (e) => { e.preventDefault(); showDuckModal(q); };
          iconCol.appendChild(duck);
        }

        if (includeYouTube) {
          const yt = document.createElement('a');
          yt.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          yt.target = '_blank';
          yt.rel = 'noopener noreferrer';
          yt.className = 'qc-inline-icon qc-yt-inline';
          yt.title = 'Search on YouTube';
          yt.innerHTML = youtubeIconSVG();
          iconCol.appendChild(yt);
        }
      });
    };

    // Find rows by alert text and add icons
    const tableRows = Array.from(results.querySelectorAll('.qc-alerts-table tbody tr'));

    tableRows.forEach(row => {
      const alertText = (row.querySelector('.qc-alert-text')?.textContent || '').toLowerCase();

      // Curated artist - add both duck and YouTube
      if (alertText.includes('curated artist')) {
        addIconsToTableRow(row, true, true);
      }
      // Blacklisted label - add only duck
      else if (alertText.includes('blacklisted label')) {
        addIconsToTableRow(row, true, false);
      }
      // Matches top song - add YouTube
      else if (alertText.includes('matches top song')) {
        addIconsToTableRow(row, false, true);
      }
    });
  } catch (e) { console.warn('Could not add inline search buttons:', e); }

  // MODIFICADO: Delegación de clic mejorada con mejor targeting para audio tracks
  try {
    results.addEventListener('click', (ev) => {
      const icon = ev.target.closest('.qc-inline-icon');
      if (icon) return;
      const line = ev.target.closest('.qc-match-item-line');
      if (!line) return;
      const codeEl = line.querySelector('code');
      
      // NUEVO: Extraer número de track para highlighting específico
      let trackNum = null;
      const trackNumAttr = line.getAttribute('data-track-num');
      if (trackNumAttr) {
        trackNum = parseInt(trackNumAttr, 10);
      } else {
        // Fallback: extraer del texto
        const text = (codeEl?.textContent || '').trim();
        const trackMatch = text.match(/Track\s+(\d+)/i);
        if (trackMatch) {
          trackNum = parseInt(trackMatch[1], 10);
        }
      }
      
      const payload = {
        rawKey: line.getAttribute('data-rawkey') || '',
        flagType: line.getAttribute('data-flag') || '',
        text: (codeEl?.textContent || '').trim(),
        trackNum: trackNum, // NUEVO: incluir número de track específico
        params: (() => { try { return JSON.parse(line.getAttribute('data-params') || '{}'); } catch { return {}; } })()
      };
      window.parent.postMessage({ tipo: 'highlightRequest', payload }, '*');
    });
  } catch (e) { /* noop */ }

  // Clean mode is always active - no toggle needed

  // MODIFICADO: Eliminado el toggle de audio analysis
  // El audio analysis ahora se ejecuta siempre automáticamente

  // Event listeners para botones de ayuda
      results.querySelectorAll('.qc-help-button').forEach(button => {
        button.onclick = (e) => {
          e.stopPropagation();
          const alertKey = button.dataset.alertKey;
          const params = JSON.parse(button.dataset.params || '{}');
          const detail = validationDetails[alertKey];

          if (detail) {
            let descriptionText = detail.description;
            if (typeof detail.description === 'function') {
              const paramValues = Object.values(params);
              descriptionText = detail.description(...paramValues);
            }
            showValidationDetailsModal(detail.title, descriptionText);
          } else {
            console.warn('No details found for alert key:', alertKey);
            showValidationDetailsModal('Information Not Available', 'No detailed information is available for this alert type.');
          }
        };
      });

  // NUEVO: Estilos dinámicos con CSS Grid corregido
      const styleTag = document.createElement('style');
      styleTag.id = 'qc-dynamic-styles';
      styleTag.textContent = `
    .qc-match-item-line { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      margin-bottom: 4px;
    }
    .qc-match-item-line > span { line-height: 1; }
    .qc-match-item-line code { 
      line-height: 1; 
      display: inline-flex; 
      align-items: center; 
      flex: 1;
    }
    .qc-flex-spacer { flex: 1 1 auto; }
    .qc-icon-col { 
      display: inline-flex; 
      align-items: center; 
      justify-content: flex-end; 
      gap: 8px; 
      min-width: 44px; 
      flex-shrink: 0;
    }
    .qc-inline-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      width: 18px; 
      height: 18px; 
      vertical-align: middle; 
      color:#ffffff; 
    }
    .qc-inline-icon:hover { color:#e5e7eb; }
    .qc-inline-icon svg { width: 16px; height: 16px; }
    .qc-summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .qc-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qc-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .qc-switch input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .qc-switch-track {
      width: 38px;
      height: 22px;
      background: #4b5563;
      border-radius: 999px;
      position: relative;
      transition: background 0.2s ease;
    }
    .qc-switch-thumb {
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: left 0.2s ease;
    }
    .qc-switch input:checked + .qc-switch-track {
      background: #10b981;
    }
    .qc-switch input:checked + .qc-switch-track .qc-switch-thumb { left: 18px; }
    .qc-switch-text {
      color: #e5e7eb;
      font-size: 0.9rem;
    }
    
    /* NUEVO: CSS Grid corregido para alertas */
    .qc-alerts-grid {
      display: grid;
      grid-template-columns: 3em 17em 2em 35em;
      gap: 8px 12px;
      align-items: start;
      padding: 0;
      margin: 0;
      word-break: break-word;
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    
    .qc-grid-item {
      display: contents;
    }
    
    .qc-summary-group-title {
      grid-column: 1 / -1;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 5px;
      color: #FFFFFF;
      text-align: left;
    }
    
    .qc-alert-icon {
      grid-column: 1;
      display: flex;
      align-items: flex-start;
      gap: 4px;
      align-self: start;
    }
    
    .qc-alert-message {
      font-size: 1.2em;
      grid-column: 2;
      word-break: break-word;
      color: #FFFFFF;
      align-self: start;
      min-width: 0;
    }
    
    .qc-match-separator {
      grid-column: 3;
      font-weight: bold;
      color: #666;
      align-self: start;
      text-align: center;
    }
    
    .qc-match-column {
      grid-column: 4;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      max-width: 70%;
      align-self: start;
    }
    
    .qc-match-item-line code {
      padding: 2px 10px 2px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 1em;
      color: #ffffff;
      background: rgba(55, 65, 81, 0.3);
      white-space: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;
      width: 100%;
      max-width: 100%;
    }
    
    /* MEJORADO: Estilos para tracks de audio en el summary */
    .qc-audio-track-detail strong {
      font-weight: normal !important;
      font-size: inherit !important;
    }
    
    .qc-audio-sub-detail {
      margin-left: 16px;
      color: #9ca3af;
      font-size: 0.85em;
    }
    
    /* REVERTIDO: Estilos para las tablas de audio analysis - colores originales más legibles */
    .qc-audio-table-container {
      margin: 12px 0;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      /* Asegurar que la tabla tenga suficiente ancho */
      min-width: 100%;
    }
    
    .qc-audio-table-header {
      background: #f3f4f6;
      color: #1f2937;
      padding: 6px 10px;
      font-weight: 600;
      border-bottom: 1px solid #d1d5db;
    }
    
    .qc-audio-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
    }
    
    .qc-audio-table th {
      background: #e5e7eb;
      color: #374151;
      padding: 6px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      border-bottom: 1px solid #d1d5db;
      white-space: normal;
      word-wrap: break-word;
    }
    
    .qc-audio-table td {
      padding: 3px 3px 3px 1px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #374151;
      vertical-align: top;
      white-space: normal;
      overflow: visible;
      word-wrap: break-word;
    }
    
    .qc-audio-table tbody tr:hover {
      background: #f9fafb;
    }
    
    .qc-audio-row-alert {
      background: #e9e1b63b
    }
    
    .qc-audio-row-alert:hover {
      background: rgba(245, 158, 11, 0.15);
    }
    
    .qc-audio-score {
      font-weight: 600;
      text-align: center;
      color: #059669;
    }
    
    /* Estilos para el icono de YouTube */
    .qc-youtube-cell {
      text-align: center;
      vertical-align: middle;
    }
    
    .qc-youtube-search {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: #ff0000;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .qc-youtube-search:hover {
      color: #cc0000;
      transform: scale(1.1);
      background: rgba(255, 0, 0, 0.1);
    }
    
    .qc-youtube-search svg {
      width: 16px;
      height: 16px;
    }
    
    /* Control de ancho de columnas para optimizar espacio - MEJORADO para legibilidad */
    .qc-audio-table th:nth-child(1),
    .qc-audio-table td:nth-child(1) {
      width: 45px;
      min-width: 45px;
      text-align: center;
    }
    
    .qc-audio-table th:nth-child(2),
    .qc-audio-table td:nth-child(2) {
      width: 100px;
      min-width: 100px;
    }
    
    .qc-audio-table th:nth-child(3),
    .qc-audio-table td:nth-child(3) {
      width: 80px;
      min-width: 80px;
    }
    
    .qc-audio-table th:nth-child(4),
    .qc-audio-table td:nth-child(4) {
      width: 100px;
      min-width: 100px;
    }
    
    .qc-audio-table th:nth-child(5),
    .qc-audio-table td:nth-child(5) {
      width: 55px;
      min-width: 55px;
      text-align: center;
    }
    
    .qc-audio-table th:nth-child(6),
    .qc-audio-table td:nth-child(6) {
      width: 250px;
      min-width: 250px;
      max-width: 300px;
    }
    
    .qc-audio-alerts {
      max-width: 250px;
      word-wrap: break-word;
      line-height: 1.4;
      min-height: 20px;
    }
    
    /* Estilo para la fila de información del track */
    .qc-audio-track-info-row {
      background: #f8fafc;
      border-bottom: 2px solid #cbd5e1;
    }
    
    .qc-audio-track-info-row td {
      font-weight: 600;
      color: #1e293b;
      background: #f1f5f9;
    }
    
    .qc-audio-track-info-row:hover {
      background: #e2e8f0;
    }
    
    .qc-alert-line {
      margin: 3px 0;
      padding: 3px 6px;
      background: #303a4a;
      border-radius: 3px;
      font-size: 0.8rem;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .qc-help-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      transition: background 0.2s ease;
      font-size: 1.2em;
      line-height: 1;
    }
    
    .qc-help-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Estilos para análisis de audio - COMPACTO */
    .qc-audio-analysis-track {
      margin: 8px 0;
      padding: 12px;
      border: 1px solid #374151;
      border-radius: 8px;
      background: rgba(55, 65, 81, 0.2);
    }
    .qc-audio-track-title {
      margin: 0 0 8px 0;
      color: #f3f4f6;
      font-size: 1em;
      font-weight: 600;
      border-bottom: 1px solid #4b5563;
      padding-bottom: 4px;
    }
    .qc-audio-fragments {
      margin-left: 8px;
    }
    .qc-audio-fragment {
      margin: 6px 0;
      padding: 8px;
      border-left: 3px solid #4b5563;
      background: rgba(75, 85, 99, 0.1);
      border-radius: 4px;
    }
    .qc-fragment-with-alerts {
      border-left: 3px solid #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .qc-fragment-normal {
      border-left: 3px solid #4b5563;
      background: rgba(75, 85, 99, 0.05);
    }
    .qc-fragment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .qc-fragment-number {
      font-weight: 600;
      color: #d1d5db;
      font-size: 0.9em;
    }
    .qc-fragment-score {
      background: #374151;
      color:rgb(0, 0, 0);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .qc-fragment-info {
      margin-bottom: 6px;
      color: #9ca3af;
      font-size: 0.85em;
    }
    .qc-fragment-data {
      margin-bottom: 2px;
    }
    .qc-fragment-data strong {
      color: #d1d5db;
    }
    .qc-fragment-alerts {
      margin-top: 6px;
    }
    .qc-alert-item {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 2px 0;
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 0.8em;
    }
    .qc-alert-red {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .qc-alert-yellow {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .qc-alert-icon {
      font-size: 0.8em;
    }
    .qc-alert-message {
      color: #f3f4f6;
    }
    .qc-track-summary {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #374151;
      color: #9ca3af;
      font-size: 0.85em;
    }
    .qc-track-alerts-count {
      font-weight: 600;
      color: #ef4444;
    }
    .qc-result-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 6px 0;
      padding: 6px;
      border-radius: 4px;
      background: rgba(31, 41, 55, 0.5);
    }
    .qc-result-with-alert {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .qc-result-normal {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .qc-result-icon {
      flex-shrink: 0;
      font-size: 1.2em;
    }
    .qc-result-content {
      flex: 1;
    }
    .qc-result-title {
      font-weight: 600;
      color: #f3f4f6;
      margin-bottom: 2px;
    }
    .qc-result-artist {
      color: #d1d5db;
      font-size: 0.9em;
      margin-bottom: 2px;
    }
    .qc-result-album {
      color: #9ca3af;
      font-size: 0.85em;
      margin-bottom: 2px;
    }
    .qc-result-score {
      color: #6b7280;
      font-size: 0.8em;
      font-weight: 500;
    }
    .qc-result-alerts {
      margin-top: 6px;
    }
    .qc-alert-item {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 3px 0;
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 0.85em;
    }
    .qc-alert-red {
      background: rgba(239, 68, 68, 0.3);
      border: 1px solid rgba(239, 68, 68, 0.5);
    }
    .qc-alert-yellow {
      background: rgba(245, 158, 11, 0.3);
      border: 1px solid rgba(245, 158, 11, 0.5);
    }
    .qc-alert-icon {
      flex-shrink: 0;
      font-size: 1em;
    }
    .qc-alert-message {
      color: #f3f4f6;
      flex: 1;
    }
      `;
      const existingStyleTag = document.getElementById('qc-dynamic-styles');
      if (existingStyleTag) {
        existingStyleTag.remove();
      }
      document.head.appendChild(styleTag);
}

// =====================
// Inicialización por pestaña (solo postMessage)
// =====================
document.getElementById('qc-results').style.display = 'none';
document.getElementById('loading').style.display = 'block';

// Function to send current flags to content.js
function sendFlagsToContentScript() {
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({
      tipo: 'qcFlagsUpdate',
      flags: currentState.flags || {}
    }, '*');
    console.log('Drawer: Sent flags to content script:', currentState.flags);
  }
}

window.addEventListener('message', e => {
  console.log('Drawer recibió mensaje:', e.data);

  // Handle request for current flags from content.js
  if (e.data?.tipo === 'requestFlags') {
    console.log('Drawer: Received request for flags');
    sendFlagsToContentScript();
    return;
  }

  if (e.data?.tipo === 'initRelease') {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('qc-results').style.display = 'block';
    updateUI({
      flags: e.data.flags || {},
      releaseData: e.data.releaseData || e.data.release || {},
      audioMatchTracks: e.data.audioMatchTracks || [],
      audioAnalysisResults: e.data.audioAnalysisResults || [], // NUEVO: Incluir resultados de audio analysis
      explicitFound: e.data.explicitFound || false,
      zendeskInfo: e.data.zendeskInfo || null,
      previouslyRejected: e.data.previouslyRejected,
      tenantInfo: e.data.tenantInfo || null
    });
  } else if (e.data?.tipo === 'updateZendesk') {
    console.log('Actualizando solo Zendesk:', e.data.zendeskInfo);
    currentState.zendeskInfo = e.data.zendeskInfo;
    renderFullUI();
  } else if (e.data?.tipo === 'updateBackofficeHistory') {
    console.log('Updating backoffice history:', e.data.backofficeHistory);
    console.log('Curated artist history:', e.data.curatedArtistHistory);
    currentState.backofficeHistory = e.data.backofficeHistory;
    currentState.curatedArtistHistory = e.data.curatedArtistHistory || [];
    renderFullUI();
  } else if (e.data?.tipo === 'refreshAnalysis') {
    console.log('Drawer: Refresh analysis requested');
    // Mostrar indicador de refresh en progreso
    showRefreshInProgress();
    // El drawer no necesita hacer nada aquí, solo log
    // El content.js se encargará del re-análisis
  } else if (e.data?.tipo === 'analysisComplete') {
    console.log('Drawer: Analysis completed successfully');
    // Ocultar overlay de refresh
    hideRefreshOverlay();
    // Mostrar mensaje de éxito temporal
    showSuccessMessage('Analysis refreshed successfully!');
  } else if (e.data?.tipo === 'analysisError') {
    console.log('Drawer: Analysis failed with error:', e.data.error);
    // Ocultar overlay de refresh
    hideRefreshOverlay();
    // Mostrar mensaje de error
    showErrorMessage('Analysis failed: ' + e.data.error);
  } else if (e.data?.tipo === 'audioAnalysisResult') {
    console.log('Drawer: Audio analysis result received:', e.data);
    // Procesar el resultado del análisis de audio
    const processedResult = processAudioAnalysisResult(e.data.result);
    if (processedResult) {
      // Agregar el resultado procesado al estado
      if (!currentState.audioAnalysisResults) {
        currentState.audioAnalysisResults = [];
      }
      currentState.audioAnalysisResults.push(processedResult);
      console.log('Audio analysis result added to state:', processedResult);
      // Re-renderizar la UI para mostrar los nuevos resultados
      renderFullUI();
    }
  } else if (e.data?.tipo === 'importantModalStateChange') {
    console.log('Drawer: Important modal state change:', e.data);
    handleImportantModalStateChange(e.data);
  } else if (e.data?.tipo === 'audioAnalysisStatus') {
    console.log('Drawer: Audio analysis status:', e.data);
    handleAudioAnalysisStatus(e.data);
  } else if (e.data?.tipo === 'optimizedAudioAnalysisComplete') {
    console.log('Drawer: Optimized audio analysis completed:', e.data);
    handleOptimizedAudioAnalysisComplete(e.data);
  } else if (e.data?.tipo === 'optimizedAudioAnalysisError') {
    console.log('Drawer: Optimized audio analysis error:', e.data);
    handleOptimizedAudioAnalysisError(e.data);
  }
  
  // NUEVO: Escuchar solicitudes de limpieza después del análisis de audio
  if (e.data.tipo === 'cleanupAfterAudioAnalysis') {
    cleanupAfterAudioAnalysis();
  }
  
  // NUEVO: Escuchar cuando se detiene el análisis de audio
  if (e.data.tipo === 'audioAnalysisStopped') {
    handleAudioAnalysisStopped(e.data.reason);
  }
});

// Clear cache button (lists and mappings)
(() => {
  const btn = document.getElementById('qc-clear-cache');
  if (!btn) return;
  btn.addEventListener('click', () => {
    try {
      // Ask background to clear extension-wide caches
          if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ action: 'QC_CLEAR_CACHE' }, (res) => {
              // Soft feedback
              const note = document.createElement('div');
              note.textContent = (res && res.ok) ? 'Cache cleared' : 'Cache cleared (local)';
              note.style.cssText = 'position:fixed; top:10px; right:10px; background:#111827; color:#fff; padding:8px 12px; border-radius:6px; z-index:999999; box-shadow:0 2px 8px rgba(0,0,0,.2); font-size:12px;';
              document.body.appendChild(note);
              try { window.parent?.postMessage({ tipo: 'refreshAnalysis' }, '*'); } catch(_) {}
              setTimeout(() => { note.remove(); location.reload(); }, 600);
            });
          } else {
            location.reload();
          }
    } catch (_) { location.reload(); }
  });
})();

// =====================
// FUNCIONES DE ANÁLISIS DE AUDIO
// =====================

// Función para mostrar indicador de refresh en progreso
function showRefreshInProgress() {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  // Crear overlay de refresh
  const refreshOverlay = document.createElement('div');
  refreshOverlay.id = 'qc-refresh-overlay';
  refreshOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    border-radius: 8px;
  `;
  
  refreshOverlay.innerHTML = `
    <div style="text-align: center; color: white;">
      <div class="qc-spinner" style="width: 40px; height: 40px; border-width: 3px; margin: 0 auto 16px;"></div>
      <div style="font-size: 16px; font-weight: 600;">Refreshing Analysis...</div>
      <div style="font-size: 14px; color: #9ca3af; margin-top: 8px;">Please wait while we re-analyze the release</div>
    </div>
  `;
  
  // Agregar al contenedor de resultados
  results.style.position = 'relative';
  results.appendChild(refreshOverlay);
  
  // Remover después de 5 segundos (por si acaso)
  setTimeout(() => {
    const existing = document.getElementById('qc-refresh-overlay');
    if (existing) existing.remove();
  }, 5000);
}

// Función para ocultar overlay de refresh
function hideRefreshOverlay() {
  const existing = document.getElementById('qc-refresh-overlay');
  if (existing) {
    existing.remove();
    console.log('QC Copilot: Refresh overlay hidden');
  }
}

// Función para mostrar mensaje de éxito temporal
function showSuccessMessage(message) {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  const successMsg = document.createElement('div');
  successMsg.id = 'qc-success-message';
  successMsg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  successMsg.textContent = message;
  
  document.body.appendChild(successMsg);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    if (successMsg.parentNode) {
      successMsg.remove();
    }
  }, 3000);
}

// Función para mostrar mensaje de error temporal
function showErrorMessage(message) {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  const errorMsg = document.createElement('div');
  errorMsg.id = 'qc-error-message';
  errorMsg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  errorMsg.textContent = message;
  
  document.body.appendChild(errorMsg);
  
  // Remover después de 5 segundos
  setTimeout(() => {
    if (errorMsg.parentNode) {
      errorMsg.remove();
    }
  }, 5000);
}

// =====================
// FUNCIONES DE ANÁLISIS DE AUDIO
// =====================

// Función principal para iniciar el análisis de audio
async function startAudioAnalysis() {
  try {
    console.log('QC Copilot: Starting audio analysis...');
    
    // MODIFICADO: Audio analysis siempre habilitado
    console.log('QC Copilot: Audio analysis always enabled, proceeding...');
    
    // Obtener tracks con alertas
    const tracksWithAlerts = currentState.releaseData?.trackSections?.filter(track => track.hasAlert) || [];
    
    if (tracksWithAlerts.length === 0) {
      console.log('QC Copilot: No tracks with audio alerts found');
      return;
    }

    console.log(`QC Copilot: Found ${tracksWithAlerts.length} tracks with audio alerts`);
    
      // NUEVO: Solicitar análisis optimizado al content.js
  console.log('QC Copilot: Requesting optimized audio analysis from content.js');
  
  // Enviar mensaje al content.js para iniciar análisis optimizado
  window.parent.postMessage({
    tipo: 'audioAnalysisControl',
    enabled: true, // NUEVO: Agregar campo enabled
    action: 'startOptimized',
    tracks: tracksWithAlerts
  }, '*');
  
  // Mostrar indicador de progreso
  showAudioAnalysisProgress();
  
  // NUEVO: Esperar resultados del análisis optimizado
  // El content.js enviará los resultados cuando estén listos
  console.log('QC Copilot: Waiting for optimized analysis results...');
  
  // NUEVO: Fallback - si no hay respuesta en 15 segundos, usar método original
  setTimeout(() => {
    if (currentState.audioAnalysisResults.length === 0) {
      console.log('QC Copilot: Optimized analysis timeout (15s), falling back to original method');
      hideAudioAnalysisProgress();
      startOriginalAudioAnalysis(tracksWithAlerts);
    }
  }, 15000);
  
  // NUEVO: Debug - verificar estado cada 5 segundos
  const debugInterval = setInterval(() => {
    console.log('QC Copilot: Debug - Audio analysis state:', {
      resultsCount: currentState.audioAnalysisResults.length,
      inProgress: true,
      timestamp: new Date().toISOString()
    });
    
    // Si ya tenemos resultados, limpiar el intervalo
    if (currentState.audioAnalysisResults.length > 0) {
      clearInterval(debugInterval);
      console.log('QC Copilot: Debug interval cleared - results received');
    }
  }, 5000);
    
  } catch (error) {
    console.error('QC Copilot: Error starting audio analysis:', error);
    hideAudioAnalysisProgress();
  }
}

// NUEVO: Función fallback para análisis de audio original
async function startOriginalAudioAnalysis(tracksWithAlerts) {
  try {
    console.log('QC Copilot: Starting original audio analysis as fallback');
    
    // Mostrar indicador de progreso
    showAudioAnalysisProgress();
    
    // Iniciar análisis secuencial original
    const analysisResults = [];
    for (const track of tracksWithAlerts) {
      try {
        console.log(`QC Copilot: Analyzing track ${track.displayNumber || track.trackIndex + 1} with original method`);
        
        const result = await analyzeTrackAudio(track);
        if (result) {
          const processedResult = processAudioAnalysisResult(result);
          if (processedResult) {
            analysisResults.push(processedResult);
            console.log(`QC Copilot: Track ${track.displayNumber || track.trackIndex + 1} analysis completed with original method`);
          }
        }
        
        // Pausa entre tracks
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`QC Copilot: Error analyzing track ${track.displayNumber || track.trackIndex + 1} with original method:`, error);
        // Continuar con el siguiente track
      }
    }

    // Actualizar UI con los resultados
    if (analysisResults.length > 0) {
      currentState.audioAnalysisResults = analysisResults;
      updateAudioAnalysisResults(analysisResults);
      console.log(`QC Copilot: Original audio analysis completed, ${analysisResults.length} results`);
      
      // NUEVO: Limpiar después del análisis original
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ tipo: 'cleanupAfterAudioAnalysis' }, '*');
      }
    } else {
      console.log('QC Copilot: No results from original audio analysis');
      currentState.audioAnalysisResults = [];
      
      // NUEVO: Limpiar también cuando no hay resultados
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ tipo: 'cleanupAfterAudioAnalysis' }, '*');
      }
    }
    
  } catch (error) {
    console.error('QC Copilot: Error in original audio analysis:', error);
    currentState.audioAnalysisResults = [];
    
    // NUEVO: Limpiar también en caso de error
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ tipo: 'cleanupAfterAudioAnalysis' }, '*');
      }
  } finally {
    hideAudioAnalysisProgress();
  }
}

// Función para analizar un track específico
async function analyzeTrackAudio(track) {
  return new Promise((resolve) => {
    const trackIndex = track.trackIndex;
    const displayNumber = track.displayNumber;
    const trackTitle = track.header || track.title || '';
    
    console.log(`Analizando track ${displayNumber} (índice: ${trackIndex}) - Título: ${trackTitle}`);
    
    let timeoutId = null;
    let done = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    const finishCheck = (result) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(result);
    };

    // Timeout de 15 segundos
    timeoutId = setTimeout(() => {
      console.warn(`Audio analysis timeout for track ${displayNumber}`);
      finishCheck(null);
    }, 15000);

    // Enviar mensaje a content.js para solicitar análisis
    window.parent.postMessage({
      tipo: 'audioAnalysisRequest',
      trackIndex: trackIndex,
      trackTitle: trackTitle
    }, '*');

    // Escuchar respuesta de content.js
    const messageHandler = (event) => {
      if (event.data.tipo === 'audioAnalysisResult' && event.data.trackIndex === trackIndex) {
        window.removeEventListener('message', messageHandler);
        finishCheck(event.data.result);
      } else if (event.data.tipo === 'audioAnalysisError' && event.data.trackIndex === trackIndex) {
        window.removeEventListener('message', messageHandler);
        console.error(`Error en análisis de audio para track ${displayNumber}:`, event.data.error);
        finishCheck(null);
      }
    };

    window.addEventListener('message', messageHandler);
  });
}

// Función para procesar los resultados de análisis de audio recibidos de content.js
function processAudioAnalysisResult(result) {
  if (!result || !result.results) { // NUEVO: Cambiado de fragments a results
    return null;
  }
  
  console.log('Procesando resultados de audio analysis:', result);
  
  // NUEVO: Procesar los results y generar alertas
  const processedResults = result.results.map(resultItem => {
    const alerts = [];
    
    console.log('Procesando result:', resultItem);
    
    // Alerta si score es 100%
    if (resultItem.score === 100) {
      console.log('Score 100% detectado para result:', resultItem.index);
      alerts.push({
        type: 'score_100',
        severity: 'red',
        message: `Score 100%`,
        result: resultItem.index
      });
    }
    
    // MEJORADO: Alerta si título es similar al del track
    if (resultItem.title && result.trackTitle) {
      const resultTitleClean = cleanStrSimple(resultItem.title);
      // Quitar numeración del título del track para comparación justa
      const trackTitleWithoutNumber = result.trackTitle.replace(/^\d+\.\s*/, '');
      const trackTitleClean = cleanStrSimple(trackTitleWithoutNumber);
      
      // Comparación más robusta con similitud
      if (resultTitleClean !== trackTitleClean) {
        const similarity = calculateSimilarity(resultTitleClean, trackTitleClean);
        console.log('Título diferente detectado:', resultItem.title, 'vs', trackTitleWithoutNumber, 'similarity:', similarity);
        
        if (similarity >= 0.8) {
          // Títulos muy similares (posible error tipográfico)
          alerts.push({
            type: 'title_similar',
            severity: 'yellow',
            message: `Similar title: "${resultItem.title}" (similarity: ${Math.round(similarity * 100)}%)`,
            result: resultItem.index,
            similarity: similarity
          });
        } else if (similarity >= 0.6) {
          // Títulos moderadamente similares
          alerts.push({
            type: 'title_moderately_similar',
            severity: 'yellow',
            message: `Moderately similar title: "${resultItem.title}" (similarity: ${Math.round(similarity * 100)}%)`,
            result: resultItem.index,
            similarity: similarity
          });
        }
        // ELIMINADO: Alerta para títulos completamente diferentes
      }
    }
    
    // MEJORADO: Alerta si artistas son diferentes o similares
    if (resultItem.artists && resultItem.artists.length > 0 && result.trackTitle) {
      // Extraer artista del track del release
      const trackArtist = extractTrackArtist(result.trackTitle);
      if (trackArtist) {
        const resultArtists = resultItem.artists.map(a => cleanStrSimple(a));
        const trackArtistClean = cleanStrSimple(trackArtist);
        
        // Verificar similitud de artistas
        resultArtists.forEach(resultArtist => {
          if (resultArtist !== trackArtistClean) {
            const artistSimilarity = calculateSimilarity(resultArtist, trackArtistClean);
            console.log('Artista diferente detectado:', resultArtist, 'vs', trackArtistClean, 'similarity:', artistSimilarity);
            
            if (artistSimilarity >= 0.8) {
              // Artistas muy similares (posible error tipográfico)
              alerts.push({
                type: 'artist_similar',
                severity: 'yellow',
                message: `Similar artist: "${resultItem.artists.find(a => cleanStrSimple(a) === resultArtist)}" (similarity: ${Math.round(artistSimilarity * 100)}%)`,
                result: resultItem.index,
                similarity: artistSimilarity
              });
            } else if (artistSimilarity >= 0.6) {
              // Artistas moderadamente similares
              alerts.push({
                type: 'artist_moderately_similar',
                severity: 'yellow',
                message: `Moderately similar artist: "${resultItem.artists.find(a => cleanStrSimple(a) === resultArtist)}" (similarity: ${Math.round(artistSimilarity * 100)}%)`,
                result: resultItem.index,
                similarity: artistSimilarity
              });
            }
            // ELIMINADO: Alerta para artistas completamente diferentes
          }
        });
      }
    }
    
    // ELIMINADO: Alerta de artistas adicionales
    
    // NUEVO: Alerta si el título o artista coincide con artistas curados
    if (currentState.flags && currentState.flags.curatedArtists && currentState.flags.curatedArtists.length > 0) {
      const curatedArtists = currentState.flags.curatedArtists;
      
      // Verificar si el título coincide con algún artista curado
      if (resultItem.title) {
        const titleMatch = curatedArtists.find(curated => 
          isSimilarTitle(resultItem.title, curated)
        );
        if (titleMatch) {
          alerts.push({ 
            type: 'curated_artist_title_match',
            severity: 'red',
            message: `Title matches curated artist: "${titleMatch}"`, 
            result: resultItem.index
          });
        }
      }
      
      // Verificar si algún artista del result coincide con artistas curados
      if (resultItem.artists && resultItem.artists.length > 0) {
        resultItem.artists.forEach(artist => {
          const artistMatch = curatedArtists.find(curated => 
            isSimilarArtist(artist, curated)
          );
          if (artistMatch) {
            alerts.push({ 
              type: 'curated_artist_match',
              severity: 'red',
              message: `Artist matches curated artist: "${artistMatch}"`, 
              result: resultItem.index
            });
          }
        });
      }
    }
    
    return {
      ...resultItem,
      alerts
    };
  });
  
  // Contar alertas únicas por tipo
  const uniqueAlertTypes = new Set();
  let score100Count = 0;
  let titleSimilarCount = 0;
  let titleModeratelySimilarCount = 0;
  let artistSimilarCount = 0;
  let artistModeratelySimilarCount = 0;
  let curatedArtistMatchCount = 0;
  let curatedArtistTitleMatchCount = 0;
  
  processedResults.forEach(resultItem => {
    resultItem.alerts.forEach(alert => {
      uniqueAlertTypes.add(alert.type);
      if (alert.type === 'score_100') score100Count++;
      else if (alert.type === 'title_similar') titleSimilarCount++;
      else if (alert.type === 'title_moderately_similar') titleModeratelySimilarCount++;
      else if (alert.type === 'artist_similar') artistSimilarCount++;
      else if (alert.type === 'artist_moderately_similar') artistModeratelySimilarCount++;
      else if (alert.type === 'curated_artist_match') curatedArtistMatchCount++;
      else if (alert.type === 'curated_artist_title_match') curatedArtistTitleMatchCount++;
    });
  });
  
  const totalAlerts = uniqueAlertTypes.size;
  console.log('Total de alertas generadas:', totalAlerts, '(100%:', score100Count, ', TitleSimilar:', titleSimilarCount, ', TitleModSimilar:', titleModeratelySimilarCount, ', ArtistSimilar:', artistSimilarCount, ', ArtistModSimilar:', artistModeratelySimilarCount, ', CuratedArtist:', curatedArtistMatchCount, ', CuratedTitle:', curatedArtistTitleMatchCount, ')');
  
  return {
    trackTitle: result.trackTitle,
    trackIndex: result.trackIndex, // NUEVO: Incluir el trackIndex
    trackArtist: result.trackArtist, // NUEVO: Incluir el artista del track
    trackAlbum: result.trackAlbum, // NUEVO: Incluir el álbum del track
    results: processedResults, // NUEVO: Cambiado de fragments a results
    totalAlerts: totalAlerts,
    alertCounts: {
      score100: score100Count,
      titleSimilar: titleSimilarCount,
      titleModeratelySimilar: titleModeratelySimilarCount,
      artistSimilar: artistSimilarCount,
      artistModeratelySimilar: artistModeratelySimilarCount,
      curatedArtistMatch: curatedArtistMatchCount,
      curatedArtistTitleMatch: curatedArtistTitleMatchCount
    }
  };
}

// MEJORADA: Función para extraer artista del track
function extractTrackArtist(trackTitle) {
  console.log(`extractTrackArtist: entrada: "${trackTitle}"`);
  
  if (!trackTitle) return null;
  
  // Quitar numeración del track si existe
  const cleanTitle = trackTitle.replace(/^\d+\.\s*/, '');
  console.log(`extractTrackArtist: título limpio: "${cleanTitle}"`);
  
  // Buscar patrones comunes como "Artist - Title" o "Title (feat. Artist)"
  const artistTitlePattern = /^(.+?)\s*[-–]\s*(.+)$/;
  const featPattern = /\(feat\.?\s*(.+?)\)/i;
  const remixPattern = /\(remix\s+by\s+(.+?)\)/i;
  const withPattern = /\(with\s+(.+?)\)/i;
  const andPattern = /\((.+?)\s+&\s+(.+?)\)/;
  
  let artist = null;
  
  // Intentar patrón "Artist - Title"
  const artistTitleMatch = cleanTitle.match(artistTitlePattern);
  if (artistTitleMatch) {
    artist = artistTitleMatch[1].trim();
    console.log(`extractTrackArtist: artista encontrado con patrón "Artist - Title": "${artist}"`);
  }
  
  // Intentar patrón "feat."
  if (!artist) {
    const featMatch = cleanTitle.match(featPattern);
    if (featMatch) {
      artist = featMatch[1].trim();
      console.log(`extractTrackArtist: artista encontrado con patrón "feat.": "${artist}"`);
    }
  }
  
  // Intentar patrón "remix by"
  if (!artist) {
    const remixMatch = cleanTitle.match(remixPattern);
    if (remixMatch) {
      artist = remixMatch[1].trim();
      console.log(`extractTrackArtist: artista encontrado con patrón "remix by": "${artist}"`);
    }
  }
  
  // Intentar patrón "with"
  if (!artist) {
    const withMatch = cleanTitle.match(withPattern);
    if (withMatch) {
      artist = withMatch[1].trim();
      console.log(`extractTrackArtist: artista encontrado con patrón "with": "${artist}"`);
    }
  }
  
  // Intentar patrón "Artist1 & Artist2"
  if (!artist) {
    const andMatch = cleanTitle.match(andPattern);
    if (andMatch) {
      artist = `${andMatch[1].trim()} & ${andMatch[2].trim()}`;
      console.log(`extractTrackArtist: artista encontrado con patrón "Artist1 & Artist2": "${artist}"`);
    }
  }
  
  // Si no se encontró ningún patrón, intentar extraer del release data
  // Esto se puede mejorar cuando tengamos acceso al release data completo
  if (!artist) {
    // Por ahora, devolver null si no se puede extraer
    console.log('No se pudo extraer artista del título:', cleanTitle);
  }
  
  console.log(`extractTrackArtist: resultado final: "${artist}"`);
  return artist;
}

// Función para calcular similitud entre dos textos usando algoritmo de Levenshtein
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  // Si son exactamente iguales, similitud 100%
  if (text1 === text2) return 1;
  
  // Si uno está contenido en el otro, similitud alta
  if (text1.includes(text2) || text2.includes(text1)) {
    return 0.9;
  }
  
  // Calcular distancia de Levenshtein
  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  
  // Convertir distancia a similitud (0 = muy diferente, 1 = idéntico)
  return Math.max(0, 1 - (distance / maxLength));
}

// Función para calcular la distancia de Levenshtein entre dos strings
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Función para verificar similitud de títulos (simplificada)
function isSimilarTitle(title1, title2) {
  if (!title1 || !title2) return false;
  
  QC_LOGGING.debug(`isSimilarTitle: comparando "${title1}" vs "${title2}"`);
  
  const clean1 = cleanStrSimple(title1);
  const clean2 = cleanStrSimple(title2);
  
  QC_LOGGING.debug(`isSimilarTitle: después de limpieza: "${clean1}" vs "${clean2}"`);
  
  // Usar la misma lógica estricta que findMatches en background.js
  // Comparar como palabras completas, no como subcadenas
  const token1 = escapeRegExp(clean1);
  const token2 = escapeRegExp(clean2);
  
  const regex1 = new RegExp(`(?<![\\w])${token1}(?![\\w])`, "i");
  const regex2 = new RegExp(`(?<![\\w])${token2}(?![\\w])`, "i");
  
  const result = regex1.test(clean2) || regex2.test(clean1);
  
  QC_LOGGING.debug(`isSimilarTitle: resultado: ${result}`);
  
  // Recopilar datos de comparación
  QC_COMPARISON_DATA.addTitleComparison(title1, title2, result ? 'similar' : 'no_match');
  
  return result;
}

// Función para actualizar la UI con los resultados del análisis
function updateAudioAnalysisResults(analysisResults) {
  console.log('=== UPDATE AUDIO ANALYSIS RESULTS ===');
  console.log('Resultados recibidos:', analysisResults);
  
  // Agregar los resultados al estado actual
  currentState.audioAnalysisResults = analysisResults;
  console.log('Estado actualizado:', currentState);
  
  // Re-renderizar la UI
  console.log('Iniciando re-render de UI...');
  try {
    renderFullUI();
    console.log('Re-render de UI completado exitosamente');
  } catch (error) {
    console.error('Error durante re-render de UI:', error);
  }
  
  // Mostrar notificación
  console.log('Análisis de audio completado:', analysisResults);
}

// Función para analizar alertas de un result (movida desde content.js)
function analyzeFragmentAlerts(result, trackTitle) {
  const alerts = [];
  console.log(`analyzeFragmentAlerts llamado con:`, { result, trackTitle });
  
  // Alerta si score es 100%
  if (result.score === 100) {
    console.log('Score 100% detectado, agregando alerta');
    alerts.push({ message: 'Score 100%', type: 'score_100' });
  }
  
  // Alerta si título es similar al del track
  if (result.title && trackTitle) {
    const isTitleSimilar = isSimilarTitle(result.title, trackTitle);
    console.log(`Comparando títulos: result.title="${result.title}" vs trackTitle="${trackTitle}", similar: ${isTitleSimilar}`);
    
    if (isTitleSimilar) {
      // Verificar si el título es exactamente igual (después de limpieza)
      const cleanResultTitle = cleanStrSimple(result.title);
      const cleanTrackTitle = cleanStrSimple(trackTitle);
      const isExactTitleMatch = cleanResultTitle === cleanTrackTitle;
      
      
      // Solo mostrar alerta si NO es una coincidencia exacta
      if (!isExactTitleMatch) {
        // Comparar con el artista del track original si está disponible
        const trackArtist = extractTrackArtist(trackTitle);
        if (trackArtist && result.artists.length > 0) {
          // Verificar si algún artista es exactamente igual
          const hasExactArtistMatch = result.artists.some(artist => {
            const cleanResultArtist = cleanStrSimple(artist);
            const cleanTrackArtist = cleanStrSimple(trackArtist);
            return cleanResultArtist === cleanTrackArtist;
          });
          
          
          if (hasExactArtistMatch) {
            // Si hay artista exacto, no mostrar alerta de título similar
            console.log('No se muestra alerta de título similar porque hay artista exacto');
          } else {
            // Verificar si hay artistas diferentes
            const hasDifferentArtist = !result.artists.some(artist => 
              isSimilarArtist(artist, trackArtist)
            );
            if (hasDifferentArtist) {
              alerts.push({ 
                message: `Similar title (${result.title}) but different artist (${result.artists.join(', ')})`, 
                type: 'title_similar_artist_different' 
              });
            }
          }
        } else {
          // Si no hay artista del track para comparar, mostrar alerta de título similar
          alerts.push({ 
            message: `Similar title (${result.title})`, 
            type: 'title_similar' 
          });
        }
      } else {
        console.log('No se muestra alerta de título similar porque es una coincidencia exacta');
      }
    }
  }
  
  // NUEVO: Alerta si el título o artista coincide con artistas curados
  if (currentState.flags && currentState.flags.curatedArtists && currentState.flags.curatedArtists.length > 0) {
    const curatedArtists = currentState.flags.curatedArtists;
    console.log('Verificando artistas curados:', curatedArtists);
    
    // Verificar si el título coincide con algún artista curado
    if (result.title) {
      const titleMatch = curatedArtists.find(curated => 
        isSimilarTitle(result.title, curated)
      );
      if (titleMatch) {
        console.log('Título coincide con artista curado:', titleMatch);
        alerts.push({ 
          message: `Title matches curated artist: "${titleMatch}"`, 
          type: 'curated_artist_title_match' 
        });
      }
    }
    
    // Verificar si algún artista del result coincide con artistas curados
    if (result.artists && result.artists.length > 0) {
      result.artists.forEach(artist => {
        const artistMatch = curatedArtists.find(curated => 
          isSimilarArtist(artist, curated)
        );
        if (artistMatch) {
          console.log('Artista coincide con artista curado:', artistMatch);
          alerts.push({ 
            message: `Artist matches curated artist: "${artistMatch}"`, 
            type: 'curated_artist_match' 
          });
        }
      });
    }
  }
  
  console.log('Alertas finales generadas:', alerts);
  
  // ELIMINADO: Alerta de score alto pero título diferente
  
  return alerts;
}

// Función helper para comparar similitud de artistas
function isSimilarArtist(artist1, artist2) {
  QC_LOGGING.debug(`isSimilarArtist: comparando "${artist1}" vs "${artist2}"`);
  
  if (!artist1 || !artist2) return false;
  
  // Usar la misma lógica estricta que findMatches en background.js
  const clean1 = cleanStrSimple(artist1);
  const clean2 = cleanStrSimple(artist2);
  
  QC_LOGGING.debug(`isSimilarArtist: después de limpieza: "${clean1}" vs "${clean2}"`);
  
  // Comparar como palabras completas, no como subcadenas
  // Usar regex para asegurar que sea una palabra completa
  const token1 = escapeRegExp(clean1);
  const token2 = escapeRegExp(clean2);
  
  const regex1 = new RegExp(`(?<![\\w])${token1}(?![\\w])`, "i");
  const regex2 = new RegExp(`(?<![\\w])${token2}(?![\\w])`, "i");
  
  const result = regex1.test(clean2) || regex2.test(clean1);
  
  QC_LOGGING.debug(`isSimilarArtist: resultado: ${result}`);
  
  // Recopilar datos de comparación
  QC_COMPARISON_DATA.addArtistComparison(artist1, artist2, result ? 'similar' : 'no_match');
  
  return result;
}

// Función helper para escapar caracteres especiales en regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// NUEVO: Función para manejar cambios de estado de modales importantes
function handleImportantModalStateChange(data) {
  // No mostrar ninguna advertencia - solo log silencioso
  const { open } = data;
  if (open) {
    console.log('QC Copilot: Important modal opened');
  } else {
    console.log('QC Copilot: Important modal closed');
  }
}

  // NUEVO: Función para manejar estado del análisis de audio
  function handleAudioAnalysisStatus(data) {
    const { enabled, inProgress, resultsCount } = data;
    
    console.log('QC Copilot: Audio analysis status update:', { enabled, inProgress, resultsCount });
    
    // MODIFICADO: Eliminada la actualización del toggle ya que no existe más
    // El audio analysis ahora se ejecuta siempre automáticamente
    
    // Mostrar indicador de progreso si está en curso
    if (inProgress) {
      showAudioAnalysisProgress();
    } else {
      hideAudioAnalysisProgress();
    }
  }

// NUEVO: Función para mostrar advertencia de modal importante
function showImportantModalWarning() {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  // Remover advertencia existente si la hay
  hideImportantModalWarning();
  
  const warning = document.createElement('div');
  warning.id = 'qc-important-modal-warning';
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #f59e0b;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  warning.innerHTML = `
    <span>⚠️</span>
    <span>Important modal is open - audio analysis paused</span>
  `;
  
  document.body.appendChild(warning);
}

// NUEVO: Función para ocultar advertencia de modal importante
function hideImportantModalWarning() {
  const existing = document.getElementById('qc-important-modal-warning');
  if (existing) {
    existing.remove();
  }
}

// NUEVO: Función para mostrar progreso del análisis de audio
function showAudioAnalysisProgress() {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  // Remover indicador existente si lo hay
  hideAudioAnalysisProgress();
  
  const progress = document.createElement('div');
  progress.id = 'qc-audio-analysis-progress';
  progress.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  progress.innerHTML = `
    <div class="qc-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
    <span>Audio analysis in progress...</span>
  `;
  
  document.body.appendChild(progress);
}

// NUEVO: Función para ocultar progreso del análisis de audio
function hideAudioAnalysisProgress() {
  const existing = document.getElementById('qc-audio-analysis-progress');
  if (existing) {
    existing.remove();
  }
}



// NUEVO: Función para manejar análisis optimizado completado
function handleOptimizedAudioAnalysisComplete(data) {
  const { results } = data;
  
  console.log('QC Copilot: Processing optimized audio analysis results:', results);
  
  // Ocultar indicador de progreso
  hideAudioAnalysisProgress();
  
  if (results && results.length > 0) {
    // Procesar cada resultado
    const processedResults = [];
    
    results.forEach(result => {
      const processedResult = processAudioAnalysisResult(result);
      if (processedResult) {
        processedResults.push(processedResult);
      }
    });
    
    // Actualizar estado y UI
    if (processedResults.length > 0) {
      currentState.audioAnalysisResults = processedResults;
      updateAudioAnalysisResults(processedResults);
      console.log(`QC Copilot: ${processedResults.length} audio analysis results processed and displayed`);
    }
  } else {
    console.log('QC Copilot: No audio analysis results to process');
    currentState.audioAnalysisResults = [];
  }
  

  }
  
  // NUEVO: Función para manejar error en análisis optimizado
  function handleOptimizedAudioAnalysisError(data) {
    const { error } = data;
    
    console.error('QC Copilot: Optimized audio analysis failed:', error);
    
    // Ocultar indicador de progreso
    hideAudioAnalysisProgress();
    
    // Mostrar mensaje de error
    showErrorMessage(`Audio analysis failed: ${error}`);
    
    // Limpiar estado
    currentState.audioAnalysisResults = [];
  }

// NUEVO: Función para mostrar mensaje de error
function showErrorMessage(message) {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  // Remover mensaje existente si lo hay
  hideErrorMessage();
  
  const errorMsg = document.createElement('div');
  errorMsg.id = 'qc-error-message';
  errorMsg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  errorMsg.innerHTML = `
    <span>❌</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(errorMsg);
  
  // Remover automáticamente después de 5 segundos
  setTimeout(() => {
    hideErrorMessage();
  }, 5000);
}

// NUEVO: Función para ocultar mensaje de error
function hideErrorMessage() {
  const existing = document.getElementById('qc-error-message');
  if (existing) {
    existing.remove();
  }
}

// NUEVO: Función para mostrar notificaciones
function showNotification(message, type = 'info') {
  const results = document.getElementById('qc-results');
  if (!results) return;
  
  // Remover notificación existente si la hay
  hideNotification();
  
  const colors = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };
  
  const notification = document.createElement('div');
  notification.id = 'qc-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 400px;
    word-wrap: break-word;
  `;
  
  notification.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Remover automáticamente después de 4 segundos
  setTimeout(() => {
    hideNotification();
  }, 4000);
}

// NUEVO: Función para ocultar notificación
function hideNotification() {
  const existing = document.getElementById('qc-notification');
  if (existing) {
    existing.remove();
  }
}

// Clean mode is always active - function removed

// NUEVO: Función para manejar análisis de audio detenido
function handleAudioAnalysisStopped(reason) {
  console.log('QC Copilot: Audio analysis stopped:', reason);
  // Aquí puedes agregar cualquier lógica adicional que quieras ejecutar cuando el análisis de audio se detenga
}
