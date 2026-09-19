"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck, Truck, Headset } from "lucide-react";

const WHATSAPP_NUMBER = "919899899150";

// Long-form SEO content block for the homepage — sits below the blog
// section. Purely static/marketing copy (no API data), so it stays a single
// self-contained client component for the FAQ accordion interaction.

const SERVICES = [
  {
    title: "Birthday Decoration",
    body: "We make birthday setups that look good on camera. From kids’ themes and first birthdays to adult parties, balloon work, and bold statement pieces, we create birthday decorations in Delhi NCR that feel personal and are ready for a proper party.",
  },
  {
    title: "Baby Shower & Godh Bharai Decoration",
    body: "Soft colours, nice florals, themed backdrops, or something different. Our baby shower decoration services bring colors, props, balloons, and small thoughtful details so the day feels special.",
  },
  {
    title: "Welcome Baby Decorations",
    body: "Bring your baby home to a nice setup. We can do customised backdrops, balloon arrangements, themed pieces and entrance décor that turn the homecoming into a memory.",
  },
  {
    title: "Naming Ceremony Decorations",
    body: "Traditional occasion with fresh styling. Our naming ceremony decorations use elegant stages, personalised backdrops, flowers, balloons, and other details that keep the celebration warm and look great.",
  },
  {
    title: "Annaprashan Decorations",
    body: "Classic traditional looks or colourful baby-friendly setups, our Annaprashan decoration services give the right backdrop for the first-rice ceremony while keeping things stylish and family-friendly.",
  },
  {
    title: "Mundan Ceremony Decorations",
    body: "An important family milestone deserves a setting that feels right. Our Mundan ceremony décor mixes traditional touches with creative styling for homes, banquet halls, and family gatherings.",
  },
  {
    title: "Anniversary Decorations",
    body: "Skip the usual heart-balloon corner. Elegant room décor, candlelit setups, floral backdrops, or surprise celebrations, our anniversary decoration services focus on making the moment feel like yours.",
  },
  {
    title: "Bachelorette & Bride-to-Be Decorations",
    body: "One bride, her people, and no boring setups. We do bold bachelorette party decoration, photo-friendly backdrops, and fun zones for brides who want their pre-wedding party to actually feel like a party.",
  },
  {
    title: "First Night & Just Married Room Decorations",
    body: "Romantic but not overdone. Flowers, soft lighting, elegant touches and personal details come together in our first-night and just-married room decoration for a nice start to the next chapter.",
  },
  {
    title: "Canopy & Cabana Decorations",
    body: "Decorate a terrace, rooftop, garden, or private corner for romantic dates with canopy drapes, candles, lights, and styling, all designed for intimate moments.",
  },
  {
    title: "Proposal Decorations",
    body: "Ready to ask the question? We set up proposal decorations for rooftops, rooms, poolside spots, homes, and other places, with romantic backdrops, flowers, lights, and custom details built around your plan.",
  },
  {
    title: "Wedding Decorations",
    body: "Entrances that stand out. Stages people remember. Details guests actually notice. Our wedding decoration services cover venue styling, stage décor, floral concepts, wedding backdrops and celebration spaces based on what you want.",
  },
  {
    title: "Corporate Event Decorations",
    body: "A professional doesn’t have to look plain. Office celebrations, inaugurations, corporate parties, launches and formal events, we create clean corporate event decoration that keeps your brand and the occasion in focus.",
  },
  {
    title: "Festive Decorations Services",
    body: "Diwali, Christmas, Lohri, Holi, Janmashtami, republic day, Independence day and more. Whether in your home, office, store or venue, our festive decoration services provide a ready-to-celebrate space, without the ready-made setups.",
  },
];

const CITIES = [
  {
    title: "Event Management & Decorations in Delhi",
    body: "For home birthdays, proposals, weddings, festive décor, and corporate events, our team brings customised event planning and event decoration in Delhi for celebrations of every size.",
  },
  {
    title: "Event Planning & Decorations in Gurugram",
    body: "Apartment party, corporate celebration, rooftop surprise, or wedding? Our event planners in Gurugram combine creative ideas with organized execution for events that need more than standard décor.",
  },
  {
    title: "Event Decorations in Noida",
    body: "Make the venue match the day's excitement. Humsafar Event does event styling and celebration setups across Noida and Greater Noida for birthdays, baby showers, weddings, anniversaries, and more.",
  },
  {
    title: "Event Decorations in Greater Noida",
    body: "From small family functions to bigger celebrations, our team delivers customised event decoration in Greater Noida with concepts built around your venue, not the same template every time.",
  },
  {
    title: "Event Decorations in Ghaziabad",
    body: "Whether it is a birthday, a wedding, a baby shower, or a proposal, we have themes, backdrop styling, and celebration-ready looks for your event at these venues in Ghaziabad.",
  },
  {
    title: "Chandigarh, Mohali & Panchkula",
    body: "Out of Delhi NCR Celebration? Humsafar Event also brings its event styling approach to Chandigarh, Mohali, and Panchkula for baby showers, anniversaries, birthdays, weddings, and more special occasions.",
  },
  {
    title: "Jaipur, Udaipur & Jodhpur",
    body: "Whether it's a party in the lively atmosphere of Jaipur or a destination-style event in Rajasthan, we have a growing network that can provide you with customised event decoration in Jaipur, Udaipur, and Jodhpur, depending on your event and venue.",
  },
  {
    title: "Pan-India Event Planning",
    body: "Planning somewhere else? Talk to us. As Humsafar Event scales across India, we are taking our planning-first, visually driven approach to more cities and more celebrations.",
  },
];

const STEPS = [
  {
    title: "Tell Us What You Are Celebrating",
    body: "Birthday, baby shower, proposal, office event, or just anything else? Let us know the day, time, and location, along with any basic needs.",
  },
  {
    title: "Share the Vibe You Want",
    body: "Elegant, playful, minimal, colorful, romantic, traditional, or full glam? Send references or just describe the feeling. We’ll start shaping the concept from there.",
  },
  {
    title: "Choose the Setup That Fits",
    body: "We help pick themes, décor elements, and setup needs that match your venue and celebration, so you don’t pay for what you don’t need.",
  },
  {
    title: "Let Our Team Take Over",
    body: "Once the concept is locked, Humsafar Event handles the decoration and setup. You don’t have to manage multiple moving parts while trying to enjoy your own event.",
  },
  {
    title: "Walk In and Enjoy Your Event",
    body: "Your only job is to show up, celebrate, and take photos. We handle the styling while you focus on the people and the moments.",
  },
];

const WHY_US = [
  {
    title: "Creative Ideas Without Cookie-Cutter Events",
    body: "Your celebration shouldn’t look like the one we did yesterday. We shape the theme, colours and styling around your occasion so the space feels personal.",
  },
  {
    title: "Everything Under One Event Umbrella",
    body: "Birthdays, baby showers, weddings, proposals, anniversaries, festive decorations, and intimate celebrations all fall under the same roof. That's why Humsafar Event is an ideal event planning company for a wide range of events.",
  },
  {
    title: "Planning That Starts With Your Vision",
    body: "You bring the idea, a Pinterest screenshot, a half-formed thought, or a blank slate. We help turn it into a practical direction that works with your space and the day.",
  },
  {
    title: "Event Decorations That Actually Photograph Well",
    body: "A setup should look good in person and on camera. We build backdrops, décor zones, and visual details around the moments guests are most likely to see, photograph, and remember.",
  },
  {
    title: "Growing Coverage Beyond Delhi NCR",
    body: "With services expanding into Chandigarh, Jaipur, and other Indian cities, Humsafar Event is building a wider network while keeping Delhi NCR as the core for planning and decoration.",
  },
  {
    title: "Less Vendor-Chasing, More Celebrating",
    body: "Hiring event planners in Delhi NCR shouldn’t give you another job. Our job is to organise the setup, so you spend less time coordinating and more time enjoying the day.",
  },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Safe & encrypted transactions" },
  { icon: Truck, title: "Pan-India Delivery", subtitle: "Serving 10+ cities nationwide" },
  { icon: Headset, title: "Dedicated Support", subtitle: "Expert help 10 AM – 7 PM" },
];

const FAQS = [
  {
    q: "Which event management services does Humsafar Event offer in Delhi NCR?",
    a: "Humsafar Event is an event management company that arranges birthday parties, weddings, baby showers, proposals, anniversaries, corporate events, festive parties and other private or family events in Delhi NCR.",
  },
  {
    q: "Does Humsafar Event provide event decoration services across Delhi NCR?",
    a: "Yes. Our event decoration in Delhi NCR includes Delhi, Greater Noida, Noida, Faridabad, Ghaziabad, and Gurugram, and we can create a unique decor style to suit your event and venue.",
  },
  {
    q: "Can Humsafar Event manage events outside Delhi NCR?",
    a: "Yes. Humsafar Event is expanding beyond Delhi NCR, with plans for event decoration throughout Chandigarh, Mohali, Panchkula, Jaipur, Udaipur, Jodhpur, and other cities in India, depending on the event.",
  },
  {
    q: "What types of event decoration can I book?",
    a: "You can book birthday decoration, baby shower décor, wedding decoration, anniversary setups, proposals, welcome babies, naming ceremonies, Annaprashan, Mundan, canopy décor, corporate events, and festive decoration.",
  },
  {
    q: "How do I book event planners in Delhi NCR with Humsafar Event?",
    a: "Share your event date, location, occasion, and preferred style with Humsafar Event. Our team will understand the requirements, discuss the decoration direction, and help plan the right setup.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">{children}</p>
  );
}

function InfoGrid({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-(--ink-100) bg-white p-5">
          <h4 className="font-display text-base font-semibold text-(--navy-800)">{item.title}</h4>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-(--ink-500)">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function FaqAccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-(--ink-100) bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-heading text-sm font-semibold text-(--navy-800)">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-(--ink-500) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-5 pb-4 font-sans text-sm leading-relaxed text-(--ink-500)">{a}</p>}
    </div>
  );
}

export function HomeSeoContent() {
  return (
    <section className="border-t border-(--ink-100) bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">
        {/* Intro */}
        <h2 className="font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
          Your Celebration, Our Plan: Trusted Event Management Company in Delhi NCR
        </h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500) sm:text-base">
          Tired of running around for décor, chasing vendors, and dealing with last-minute messes? Humsafar Event is
          a trusted event management company in Delhi NCR that handles planning, styling, and coordination. You get
          a smooth, organised and memorable celebration without the usual stress.
        </p>

        <h3 className="mt-8 font-display text-xl font-semibold text-(--navy-800)">
          Event Management Company in Delhi NCR That Turns Every Celebration Into a Showstopper
        </h3>
        <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500) sm:text-base">
          Big moments need more than basic planning and the same old décor. Humsafar Event is the event management
          company in Delhi NCR that brings the wow factor, clear planning, and personality to any celebration.
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500) sm:text-base">
          From intimate domestic celebrations to grand events, we have the capabilities to cover it all, from
          corporate celebrations to festive setups. Our team plans, creates, and implements it on the ground. You
          can enjoy the day instead of coordinating vendors, décor, and last-minute changes.
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500) sm:text-base">
          Need creative event planners in Delhi NCR, full event decoration services, or a team to handle the whole
          celebration from start to finish? The Humsafar Event is ready.
        </p>

        <p className="mt-6 font-display text-lg font-semibold text-(--navy-800)">
          Plan Less. Celebrate More. Let Humsafar Event Take It From Here.
        </p>

        {/* Services */}
        <div className="mt-12">
          <Eyebrow>What We Do</Eyebrow>
          <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
            Our Event Management Services in Delhi NCR &amp; Across India
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-(--ink-500)">
            We don’t do copy-paste décor. We don’t force one theme on every event. And we don’t follow a boring
            fixed playbook. We create ideas at Humsafar Event based on your event, setting and atmosphere. We cater
            for corporate events and festive décor, birthdays, family gatherings, proposals, and weddings.
          </p>
          <InfoGrid items={SERVICES} />
        </div>

        {/* Spotlight callout */}
        <div className="mt-12 rounded-2xl border border-(--ink-100) bg-(--surface-alt,#F7F9FC) p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-(--navy-800)">
            Event Decorations Services in Delhi NCR Made to Steal the Spotlight
          </h3>
          <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500)">
            A venue is just a room until the right details come in. Our event decoration services in Delhi NCR put
            themes, balloons, flowers, lighting, backdrops, props, entrances and styled zones together into one
            clear look. We don’t scatter random pieces around. We build the setup around the feeling you want
            people to get when they walk in.
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500)">
            Looking for event decorators in Delhi NCR, party decoration services or customised celebration
            decoration? Tell us the occasion, share what you have in mind and leave the rest to us.
          </p>
        </div>

        {/* City coverage */}
        <div className="mt-12">
          <Eyebrow>Where We Work</Eyebrow>
          <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
            From Delhi NCR to Pan India, We Bring Celebrations to Life
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-(--ink-500)">
            Good events shouldn’t stop at one pin code. Delhi NCR is our main area, with strong coverage in the key
            celebration spots. We are also expanding event decoration and planning into Chandigarh, Rajasthan, and
            other cities in India.
          </p>
          <InfoGrid items={CITIES} />
        </div>

        {/* How it works */}
        <div className="mt-12">
          <Eyebrow>How Booking Works</Eyebrow>
          <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
            How to Get Started With Humsafar Event for Event Planning
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-(--ink-500)">
            Planning an event shouldn’t mean 10 vendor calls and 20+ screenshots floating in WhatsApp. We keep
            things simple and focused on turning your idea into something that can actually happen.
          </p>
          <ol className="mt-6 flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--orange-50,#FFF4E8) font-heading text-sm font-bold text-(--orange-600)">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-(--navy-800)">{step.title}</h3>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-(--ink-500)">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Why choose us */}
        <div className="mt-12">
          <Eyebrow>Why Humsafar Event</Eyebrow>
          <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
            Why Choose Humsafar Event as the Best Event Management Company in Delhi NCR?
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-(--ink-500)">
            Humsafar Event is the best event management company in Delhi NCR for people who want their celebration
            to feel planned, polished, and personal, not pulled from a generic catalogue. We mix creative event
            styling, celebration services, and location-specific work to make the process easier from the first
            idea to the finished setup.
          </p>
          <InfoGrid items={WHY_US} />
        </div>

        {/* Trust badges */}
        <div className="mt-12 grid grid-cols-1 divide-y divide-(--ink-100) rounded-2xl border border-(--ink-100) bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3 px-6 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--coral-100)">
                <badge.icon className="h-5 w-5 text-(--coral-600)" />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold text-(--navy-800)">{badge.title}</p>
                <p className="font-sans text-xs text-(--ink-500)">{badge.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-(--ink-100) bg-(--surface-warm,#FFF9F2) p-8 text-center">
          <h3 className="font-display text-lg font-semibold text-(--navy-800) sm:text-xl">
            Let’s Give Your Celebration the Spotlight It Deserves
          </h3>
          <p className="max-w-xl font-sans text-sm leading-relaxed text-(--ink-500)">
            Got the venue? Got the guest list? Good. Now let Humsafar Event turn the empty space into the part
            people remember. Tell us what you’re celebrating, where it’s happening, and the vibe you want. We’ll
            take it from idea to ready.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'd like to enquire about event decorations.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 font-heading text-sm font-semibold text-white hover:bg-[#20bd5a]"
          >
            Reach out today for Event Decorations
          </a>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-1.5 font-sans text-sm text-(--ink-500)">
              Everything you need to know about Humsafar Event
            </p>
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3">
            {FAQS.map((faq, i) => (
              <FaqAccordionItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
