import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { OrbitBrand } from './ui.jsx';

export default function Contact({ onBack }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF4E8] text-[#4A0A13] font-sans selection:bg-[#D4AF37] selection:text-[#FAF4E8] relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-[#F5D77F]/12 blur-[150px]" />

      {/* Header Bar */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-bold text-[#4A0A13] hover:text-[#B8860B] transition cursor-pointer"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <OrbitBrand size={32} />
          <span className="font-mono text-xs font-extrabold uppercase tracking-[0.2em] text-[#B8860B]">
            CONSCIOUS ORBITAL
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 md:py-16">
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37] bg-[#FAF4E8] px-4 py-1.5 shadow-xs">
            <Sparkles size={14} className="text-[#D4AF37]" />
            <span className="font-mono text-xs font-bold text-[#B8860B] uppercase tracking-[0.18em]">
              Contact Us
            </span>
          </div>
          <h1 className="font-serif italic text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#4A0A13] leading-tight">
            Let's Start a Conversation
          </h1>
          <p className="text-base md:text-lg text-[#7A1C29] font-sans leading-relaxed">
            Have questions about our platform? Want a demo? We're here to help your business navigate forward.
          </p>
        </div>

        {/* 2-Column Grid: Form & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT: Send Us a Message Form */}
          <div className="lg:col-span-7 rounded-3xl border-2 border-[#D4AF37]/40 bg-[#FAF4E8] p-8 md:p-10 shadow-xl">
            <h2 className="font-sans text-2xl font-extrabold text-[#4A0A13] mb-6">
              Send Us a Message
            </h2>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-[#D4AF37] bg-[#4A0A13] p-8 text-center text-[#FAF4E8] space-y-4 my-6"
              >
                <CheckCircle2 size={48} className="mx-auto text-[#F5D77F]" />
                <h3 className="font-sans text-2xl font-bold">Thank You!</h3>
                <p className="text-sm text-[#EAD5D8]">
                  Your message has been received. Our team will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 rounded-full border border-[#D4AF37] bg-[#FAF4E8] px-6 py-2 text-xs font-bold text-[#4A0A13] hover:bg-[#F5EAD4] transition cursor-pointer"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#B8860B] font-bold">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#FAF4E8] px-4 py-3 text-sm text-[#4A0A13] placeholder-[#7A1C29]/50 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#B8860B] font-bold">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#FAF4E8] px-4 py-3 text-sm text-[#4A0A13] placeholder-[#7A1C29]/50 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Company */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#B8860B] font-bold">
                      Company
                    </label>
                    <input
                      type="text"
                      placeholder="Your company name"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#FAF4E8] px-4 py-3 text-sm text-[#4A0A13] placeholder-[#7A1C29]/50 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#B8860B] font-bold">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#FAF4E8] px-4 py-3 text-sm text-[#4A0A13] focus:border-[#4A0A13] focus:outline-none transition shadow-xs cursor-pointer"
                    >
                      <option value="">Select a topic</option>
                      <option value="demo">Request a Demo</option>
                      <option value="platform">Platform Inquiry</option>
                      <option value="pricing">Pricing &amp; Enterprise</option>
                      <option value="support">General Support</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B8860B] font-bold">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Tell us about your needs..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#FAF4E8] px-4 py-3 text-sm text-[#4A0A13] placeholder-[#7A1C29]/50 focus:border-[#4A0A13] focus:outline-none transition shadow-xs resize-y"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-[#D4AF37] bg-[#4A0A13] hover:bg-[#5C0F1A] px-8 py-4 text-sm font-bold text-[#FAF4E8] shadow-lg transition cursor-pointer"
                >
                  <Send size={16} className="text-[#F5D77F]" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Contact Information & Hours */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border-2 border-[#D4AF37]/50 bg-[#4A0A13] text-[#FAF4E8] p-8 md:p-10 shadow-xl space-y-8">
              <h2 className="font-sans text-2xl font-extrabold text-[#FAF4E8]">
                Get in Touch
              </h2>

              <div className="space-y-6">
                {/* Email Us */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#5C0F1A] text-[#F5D77F]">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5D77F] font-bold">
                      Email Us
                    </h4>
                    <a href="mailto:dywebixtechnologies@gmail.com" className="text-sm text-[#EAD5D8] hover:text-[#FAF4E8] transition">
                      dywebixtechnologies@gmail.com
                    </a>
                  </div>
                </div>

                {/* Call Us */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#5C0F1A] text-[#F5D77F]">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5D77F] font-bold">
                      Call Us
                    </h4>
                    <a href="tel:+916369109974" className="text-sm text-[#EAD5D8] hover:text-[#FAF4E8] transition">
                      +91 63691 09974
                    </a>
                  </div>
                </div>

                {/* Visit Us */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#5C0F1A] text-[#F5D77F]">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5D77F] font-bold">
                      Visit Us
                    </h4>
                    <p className="text-sm text-[#EAD5D8]">
                      Salem – 636005, Tamil Nadu<br />
                      India
                    </p>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#5C0F1A] text-[#F5D77F]">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5D77F] font-bold">
                      Business Hours
                    </h4>
                    <p className="text-sm text-[#EAD5D8]">
                      Mon – Fri: 9:00 AM – 6:00 PM IST<br />
                      Sat – Sun: Closed
                    </p>
                  </div>
                </div>
              </div>

              {/* Follow Us */}
              <div className="pt-4 border-t border-[#D4AF37]/30 space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5D77F] font-bold">
                  Follow Us
                </h4>
                <div className="flex items-center gap-4 text-lg">
                  <a
                    href="https://www.instagram.com/dywebix.tech?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw=="
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#5C0F1A] text-[#FAF4E8] hover:border-[#D4AF37] hover:text-[#F5D77F] transition"
                  >
                    📷
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
