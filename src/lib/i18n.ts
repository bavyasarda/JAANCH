/**
 * UI strings in the six supported languages. Deterministic (no LLM) so the interface itself is
 * vernacular, not just the AI output. English stays visible alongside as the "·" second half.
 */
export type UiKey =
  | "labelPhoto" | "uploadHint" | "productLink" | "pasteInstead" | "iAm" | "language" | "askQuestion" | "questionPlaceholder"
  | "check" | "checking" | "verdict" | "compliant" | "violations" | "needsReview" | "findings" | "listen" | "stop" | "product"
  | "tryAnother" | "grievance" | "fixList" | "report" | "agentSteps" | "openReport" | "shareWhatsApp" | "copy" | "copied"
  | "passedChecks" | "listVsLabel" | "progress";

const STRINGS: Record<string, Record<UiKey, string>> = {
  "en-IN": {
    labelPhoto: "Label photo", uploadHint: "Tap to upload or take a photo of the back of the pack", productLink: "Product link (optional)",
    pasteInstead: "Paste listing text instead", iAm: "I am a", language: "Language", askQuestion: "Ask a question (optional)",
    questionPlaceholder: "e.g. Is the MRP printed correctly on this pack?", check: "Jaanch karo", checking: "Checking…", verdict: "Verdict",
    compliant: "Compliant", violations: "Violations found", needsReview: "Needs review", findings: "Findings", listen: "Listen", stop: "Stop",
    product: "Product", tryAnother: "Check another pack", grievance: "Grievance draft", fixList: "Fix-list for the next print run",
    report: "Compliance report", agentSteps: "Agent steps", openReport: "Open report", shareWhatsApp: "Share on WhatsApp", copy: "Copy", copied: "Copied",
    passedChecks: "Passed checks", listVsLabel: "Label vs online listing", progress: "Reading the label, running the rule engine, explaining in your language…",
  },
  "hi-IN": {
    labelPhoto: "लेबल की फ़ोटो", uploadHint: "पैकेट के पीछे की फ़ोटो लें या अपलोड करें", productLink: "प्रोडक्ट लिंक (वैकल्पिक)",
    pasteInstead: "लिस्टिंग का टेक्स्ट पेस्ट करें", iAm: "मैं हूँ", language: "भाषा", askQuestion: "सवाल पूछें (वैकल्पिक)",
    questionPlaceholder: "जैसे: क्या इस पैकेट पर MRP सही लिखा है?", check: "जाँच करो", checking: "जाँच हो रही है…", verdict: "फ़ैसला",
    compliant: "नियमों के अनुसार", violations: "उल्लंघन मिले", needsReview: "समीक्षा ज़रूरी", findings: "निष्कर्ष", listen: "सुनें", stop: "रोकें",
    product: "उत्पाद", tryAnother: "दूसरा पैकेट जाँचें", grievance: "शिकायत का मसौदा", fixList: "अगली छपाई के लिए सुधार-सूची",
    report: "अनुपालन रिपोर्ट", agentSteps: "एजेंट के कदम", openReport: "रिपोर्ट खोलें", shareWhatsApp: "WhatsApp पर भेजें", copy: "कॉपी", copied: "कॉपी हो गया",
    passedChecks: "पास हुई जाँचें", listVsLabel: "लेबल बनाम ऑनलाइन लिस्टिंग", progress: "लेबल पढ़ा जा रहा है, नियम जाँचे जा रहे हैं, आपकी भाषा में समझाया जा रहा है…",
  },
  "mr-IN": {
    labelPhoto: "लेबलचा फोटो", uploadHint: "पाकिटाच्या मागील बाजूचा फोटो काढा किंवा अपलोड करा", productLink: "प्रोडक्ट लिंक (ऐच्छिक)",
    pasteInstead: "लिस्टिंगचा मजकूर पेस्ट करा", iAm: "मी आहे", language: "भाषा", askQuestion: "प्रश्न विचारा (ऐच्छिक)",
    questionPlaceholder: "उदा. या पाकिटावर MRP बरोबर छापली आहे का?", check: "तपासा", checking: "तपासणी सुरू आहे…", verdict: "निकाल",
    compliant: "नियमांनुसार", violations: "उल्लंघन आढळले", needsReview: "पुनरावलोकन आवश्यक", findings: "निष्कर्ष", listen: "ऐका", stop: "थांबवा",
    product: "उत्पादन", tryAnother: "दुसरे पाकीट तपासा", grievance: "तक्रारीचा मसुदा", fixList: "पुढील छपाईसाठी दुरुस्ती-यादी",
    report: "अनुपालन अहवाल", agentSteps: "एजंटची पावले", openReport: "अहवाल उघडा", shareWhatsApp: "WhatsApp वर पाठवा", copy: "कॉपी", copied: "कॉपी झाले",
    passedChecks: "उत्तीर्ण तपासण्या", listVsLabel: "लेबल विरुद्ध ऑनलाइन लिस्टिंग", progress: "लेबल वाचत आहे, नियम तपासत आहे, तुमच्या भाषेत समजावत आहे…",
  },
  "ta-IN": {
    labelPhoto: "லேபிள் புகைப்படம்", uploadHint: "பொட்டலத்தின் பின்புறத்தைப் படம் எடுக்கவும் அல்லது பதிவேற்றவும்", productLink: "தயாரிப்பு இணைப்பு (விருப்பம்)",
    pasteInstead: "பட்டியல் உரையை ஒட்டவும்", iAm: "நான்", language: "மொழி", askQuestion: "கேள்வி கேளுங்கள் (விருப்பம்)",
    questionPlaceholder: "உதா. இந்த பொட்டலத்தில் MRP சரியாக அச்சிடப்பட்டுள்ளதா?", check: "சரிபார்", checking: "சரிபார்க்கிறது…", verdict: "தீர்ப்பு",
    compliant: "விதிகளுக்கு இணங்குகிறது", violations: "மீறல்கள் கண்டறியப்பட்டன", needsReview: "மறுஆய்வு தேவை", findings: "கண்டுபிடிப்புகள்", listen: "கேளுங்கள்", stop: "நிறுத்து",
    product: "தயாரிப்பு", tryAnother: "மற்றொரு பொட்டலத்தைச் சரிபார்", grievance: "புகார் வரைவு", fixList: "அடுத்த அச்சுக்கான திருத்தப் பட்டியல்",
    report: "இணக்க அறிக்கை", agentSteps: "ஏஜென்ட் படிகள்", openReport: "அறிக்கையைத் திற", shareWhatsApp: "WhatsApp-இல் பகிர்", copy: "நகலெடு", copied: "நகலெடுக்கப்பட்டது",
    passedChecks: "தேர்ச்சி பெற்ற சோதனைகள்", listVsLabel: "லேபிள் vs ஆன்லைன் பட்டியல்", progress: "லேபிளைப் படிக்கிறது, விதிகளைச் சரிபார்க்கிறது, உங்கள் மொழியில் விளக்குகிறது…",
  },
  "bn-IN": {
    labelPhoto: "লেবেলের ছবি", uploadHint: "প্যাকেটের পিছনের ছবি তুলুন বা আপলোড করুন", productLink: "পণ্যের লিঙ্ক (ঐচ্ছিক)",
    pasteInstead: "লিস্টিংয়ের লেখা পেস্ট করুন", iAm: "আমি", language: "ভাষা", askQuestion: "প্রশ্ন করুন (ঐচ্ছিক)",
    questionPlaceholder: "যেমন: এই প্যাকেটে MRP ঠিকমতো লেখা আছে কি?", check: "যাচাই করুন", checking: "যাচাই চলছে…", verdict: "রায়",
    compliant: "নিয়ম মেনে চলে", violations: "লঙ্ঘন পাওয়া গেছে", needsReview: "পর্যালোচনা দরকার", findings: "ফলাফল", listen: "শুনুন", stop: "থামান",
    product: "পণ্য", tryAnother: "অন্য প্যাকেট যাচাই করুন", grievance: "অভিযোগের খসড়া", fixList: "পরবর্তী ছাপার জন্য সংশোধন-তালিকা",
    report: "সম্মতি প্রতিবেদন", agentSteps: "এজেন্টের ধাপ", openReport: "প্রতিবেদন খুলুন", shareWhatsApp: "WhatsApp-এ পাঠান", copy: "কপি", copied: "কপি হয়েছে",
    passedChecks: "পাস হওয়া পরীক্ষা", listVsLabel: "লেবেল বনাম অনলাইন লিস্টিং", progress: "লেবেল পড়া হচ্ছে, নিয়ম যাচাই হচ্ছে, আপনার ভাষায় বোঝানো হচ্ছে…",
  },
  "te-IN": {
    labelPhoto: "లేబుల్ ఫోటో", uploadHint: "ప్యాకెట్ వెనుక భాగాన్ని ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి", productLink: "ఉత్పత్తి లింక్ (ఐచ్ఛికం)",
    pasteInstead: "లిస్టింగ్ టెక్స్ట్ పేస్ట్ చేయండి", iAm: "నేను", language: "భాష", askQuestion: "ప్రశ్న అడగండి (ఐచ్ఛికం)",
    questionPlaceholder: "ఉదా. ఈ ప్యాకెట్‌పై MRP సరిగ్గా ముద్రించారా?", check: "తనిఖీ చేయండి", checking: "తనిఖీ జరుగుతోంది…", verdict: "తీర్పు",
    compliant: "నియమాలకు అనుగుణంగా ఉంది", violations: "ఉల్లంఘనలు కనుగొనబడ్డాయి", needsReview: "సమీక్ష అవసరం", findings: "ఫలితాలు", listen: "వినండి", stop: "ఆపండి",
    product: "ఉత్పత్తి", tryAnother: "మరో ప్యాకెట్ తనిఖీ చేయండి", grievance: "ఫిర్యాదు ముసాయిదా", fixList: "తదుపరి ముద్రణకు సవరణల జాబితా",
    report: "అనుపాలన నివేదిక", agentSteps: "ఏజెంట్ దశలు", openReport: "నివేదిక తెరవండి", shareWhatsApp: "WhatsAppలో పంపండి", copy: "కాపీ", copied: "కాపీ అయింది",
    passedChecks: "ఉత్తీర్ణమైన తనిఖీలు", listVsLabel: "లేబుల్ vs ఆన్‌లైన్ లిస్టింగ్", progress: "లేబుల్ చదువుతోంది, నియమాలు తనిఖీ చేస్తోంది, మీ భాషలో వివరిస్తోంది…",
  },
};

export function t(lang: string, key: UiKey): string {
  return STRINGS[lang]?.[key] ?? STRINGS["en-IN"][key];
}

/** "English · <local>" style label; returns just English when the language is English. */
export function bi(lang: string, key: UiKey): string {
  const en = STRINGS["en-IN"][key];
  const local = t(lang, key);
  return lang === "en-IN" || local === en ? en : `${en} · ${local}`;
}
