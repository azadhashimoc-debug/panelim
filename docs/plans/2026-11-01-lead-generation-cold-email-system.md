# Google Maps Lead Generation & Personalized Cold Email System Implementation Plan

**Goal:** Scrape exactly up to 50 targeted businesses from Google Maps for panelim.az (cafes, restaurants, stores, clinics in Baku/Azerbaijan), inspect their websites for pain points, extract contact emails via Leadfinder heuristics, generate personalized cold emails addressing employee attendance/payroll challenges, and synchronize them as full Gmail drafts ready for review and sending.

**Architecture:** 
A modular Python system consisting of:
1. `gmaps_scraper.py`: Headless browser-based Google Maps scraper with strict limit-at-50 control.
2. `website_analyzer.py`: Web scraper that visits candidate websites to extract services, tone, and operational context.
3. `email_finder.py`: Multi-source contact finder (website crawler, regex parser, contact/social page detector, domain pattern synthesis).
4. `cold_email_generator.py`: Personalized outbound copywriter based on the `cold-email` skill (observation -> problem -> solution -> low-friction CTA).
5. `gmail_service.py`: Gmail integration supporting OAuth2 and App Password to create rich Gmail drafts (To, Subject, Plain/HTML Body) and optional one-click sending.
6. `dashboard_app.py` & `run_lead_system.py`: Central interactive CLI and Web Dashboard to run, inspect, edit drafts, and sync with Gmail.

**Tech Stack:** Python 3.10, Playwright, BeautifulSoup4, Requests, Google Auth / Gmail API, FastAPI / HTTP Server.

---

### Task 1: Google Maps Scraper (`gmaps_scraper.py`)
- Configurable search query (default: Baku restaurants, cafes, supermarkets, clinics).
- Strict ceiling: stops immediately upon scraping 50 unique leads.
- Extracts name, category, rating, reviews, address, phone number, website, and Google Maps URL.

### Task 2: Website Analyzer (`website_analyzer.py`)
- Analyzes business domain and pages (`/`, `/about`, `/contact`, `/elaqe`, `/haqqimizda`, `/menu`).
- Extracts business model details, branch count indicators, pain points for staff tracking and shift management.

### Task 3: Leadfinder & Email Extractor (`email_finder.py`)
- Regex-based high precision email parser with spam/placeholder filtering.
- Crawls contact pages and social links.
- Synthesizes domain mailbox candidates (`info@`, `contact@`, `office@`, `hr@`).

### Task 4: Cold Email Copywriter (`cold_email_generator.py`)
- Follows the `cold-email` skill rules: peer tone, zero corporate fluff, sharp internal subject line, Azerbaijan language.
- Context: `panelim.az` (QR kod + geolokasiya ilə işçi davamiyyəti, gecikmələrin və saxta girişlərin aradan qaldırılması, daxili maaş və avans uçotu, 14 günlük ödənişsiz sınaq).
- Populates To, Subject, and detailed Body tailored to each company.

### Task 5: Gmail Integration (`gmail_service.py`)
- Connects to Gmail via OAuth2 / App Password / Google API.
- Implements `create_draft(to, subject, body_plain, body_html)`: creates draft directly in user's Gmail Drafts box.
- Implements `send_draft(draft_id)` or `send_email(...)` when paneer commands it.

### Task 6: CLI & Web Dashboard Interface
- CLI commands: `scrape`, `analyze`, `generate-emails`, `sync-drafts`, `send`.
- Web UI on local port (e.g. 5050): view all 50 leads in real-time, preview generated emails, edit, and 1-click push to Gmail drafts.

### Task 7: Lead Research Assistant Integration (`lead_research_assistant`)
- Embedded in `website_analyzer.py` and displayed across CLI and Dashboard.
- Generates ICP Fit Score (1-10), Decision Maker role (Direktor, Kafe Rəhbəri, Filial Müdiri), Key Value Proposition, and Icebreakers.

### Task 8: n8n Team of AI Copywriters (`copy_assistant.py`)
- Cold Email Copywriter: Direct personalized peer outreach.
- Sales Letter Agent: High-converting long-form B2B sales letter.
- Ad Copy Agent: Meta/Instagram/Facebook advertising copy with headlines, primary text, and CTA.
- Ad Script Agent: 30-second TikTok & Instagram Reels video scripts.
- VSL Script Agent: Full video sales letter with hook, tension, case study, and offer.
- Google Docs Export Sync: Formats and streams all copy suites to Google Docs (`1eI4Pdje4As0KEYjEG3prMUQCiLe-tUswnwNUVQG2GSw`).

### Task 9: n8n Blog Writing & Inbound SEO Engine (`seo_blog_engine.py`)
- Ported from the n8n Blog Writing workflow with Tavily SERP Search integration (`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`).
- Title Refiner (50-60 characters, click-worthy).
- Key Takeaways & Introduction (400-450 words).
- Semantic Outline & HTML Main Body with internal links to `panelim.az`.
- Actionable Conclusion (500-550 words) with 14-day free trial CTA.
- Meta Description (150-160 characters) and Midjourney/DALL-E Image Prompt (`--ar 16:9`).
- Accessible via CLI (`--action blog --keyword "..."`) and the interactive Web Dashboard.
