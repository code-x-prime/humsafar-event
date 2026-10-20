// Long-form SEO copy shown under the listing on a city page (/locations/[slug])
// or a category page (/category/[slug]). Each entry is keyed by that page's
// slug; a page with no entry simply shows no extra content. To add another,
// add another entry — the pages and <LocationSeoContent> need no changes.

export interface LocationContentItem {
  title: string;
  body: string[];
}

export interface LocationContentSection {
  eyebrow?: string;
  heading: string;
  intro?: string[];
  items?: LocationContentItem[];
  // Short "Label: text" lines rendered as a list (e.g. lighting ideas).
  bullets?: { label: string; text: string }[];
  outro?: string[];
  // Shown as a call-to-action line with WhatsApp and call links.
  cta?: string;
}

export interface LocationContent {
  // Override the page's own meta tags while this content is live.
  metaTitle: string;
  metaDescription: string;
  // Optional: replace a city page's hero heading and line.
  heroTitle?: string;
  heroSubtitle?: string;
  heading: string;
  intro: string[];
  sections: LocationContentSection[];
  faqs: { q: string; a: string }[];
}

export const CONTACT_NUMBER_DISPLAY = "+91-9899899150";
export const CONTACT_NUMBER_WHATSAPP = "919899899150";

const DIWALI: LocationContent = {
  metaTitle: "Diwali Decoration Services for Homes, Offices & Shops in Delhi NCR | Humsafar Events",
  metaDescription:
    "Diwali decoration services in Delhi NCR for homes, offices, shops, showrooms and halls — floral entrances, balloon backdrops and festive lighting. WhatsApp +91-9899899150 for a free quote.",
  heading: "Diwali Decoration Services for Homes, Offices & Businesses",
  intro: [
    "No one plans to hang lights at 9 p.m. the night before Diwali. It just happens. The sweets arrive, relatives call to say they’re coming early, and suddenly the front door looks bare. That’s the gap Humsafar Event’s Diwali decoration services fill. Flowers, lights, balloon backdrops, and a proper festive entrance. We do it for homes, offices, shops, and event venues.",
    "Planning Laxmi Puja at home? Corporate party on Friday? A showroom that has to look festive before customers pour in? There’s a setup for each of those. Go through the collection, choose what you like, and tell us what you need.",
    "Looking for Diwali Decoration Services in Delhi or a nearby city? Look at the designs first. Then send our team a note with your location, your theme, and your requirements.",
  ],
  sections: [
    {
      eyebrow: "What We Do",
      heading: "Explore Our Diwali Decoration Services",
      intro: [
        "A living room isn’t a showroom, and a party hall isn’t an office lobby. Different spaces need different things. Our Diwali decoration services are organised that way. You get one cohesive festive look and skip the garland hunt.",
      ],
      items: [
        {
          title: "Diwali House Decoration",
          body: [
            "Diwali really happens at home. For Diwali house decoration, we work with floral garlands, backdrops, festive lights, and a styled entrance. Family coming over? Puja in the evening? Either way, our Diwali decoration services can suggest designs that fit your rooms and your space.",
            "Looking for home decorators for Diwali? Start with one question. Traditional or modern? Go with classic flowers, go sleeker, or blend the two. If the house feels warm the moment someone walks in, it works.",
          ],
        },
        {
          title: "Diwali Office Decoration",
          body: [
            "An office Diwali party in a bare lobby is a bit sad, let’s be real. Good Diwali office decoration fixes that. We can do reception, the office entrance, the corner where the team gathers, and the backdrop for the corporate party. People will feel like the festival has come to work.",
            "Browse Diwali decor for office ideas that match your layout, your brand colours, and what you plan to do on the day.",
          ],
        },
        {
          title: "Diwali Hall Decoration",
          body: [
            "Hosting a Diwali party or a big family gathering? Our Diwali hall decoration can include floral installations, decorative arches, themed backdrops, balloon arrangements, and lights. Guests walk in, and the place already looks ready. Everyone takes photos, so give them something great to stand in front of. With our Diwali decoration services, we tailor the styling to your venue, guests, and event theme.",
          ],
        },
        {
          title: "Diwali Showroom Decoration",
          body: [
            "This is the season customers walk in with festive shopping on their minds. Attractive Diwali showroom decoration gets your space ready.",
            "Lights, a floral entrance, matching backdrops, and a few festive touches near the displays. The showroom feels inviting, and customers don't have to hunt for your products. Our Diwali decoration services can help you find designs that suit your interiors. Customers get the same festive look from the door to the counter.",
          ],
        },
        {
          title: "Diwali Decoration for Shops",
          body: [
            "A small shop? It still deserves a festive look. Our Diwali decoration for shop options are planned around your entrance, your display areas, and the space you’ve got. Lights, flowers, balloons, or a festive backdrop all add seasonal charm.",
            "Keep the aisles clear so customers don’t have to squeeze past decorations. Humsafar Events can help you decide what suits your shop and how it should look during the festival.",
          ],
        },
        {
          title: "Diwali Entrance Decoration",
          body: [
            "People form an opinion of a place in a couple of seconds, and that opinion starts at the entrance. Diwali entrance decoration can include floral arches, marigold garlands, decorative backdrops, and matching lights. Your home, your office, an event venue. The entrance sets the mood before anyone steps in.",
            "Look through our Diwali decoration services and tell us about the entrance design you have in mind. We’ll make it match your festive theme.",
          ],
        },
        {
          title: "Diwali Door Decoration",
          body: [
            "Sometimes the doorway is enough. Creative Diwali door decoration can mean floral torans, hangings, garlands, and a few matching extras. Love the traditional look? We can do Diwali door decor inspired by it. Want something modern? That works too. Match it to your entrance and the rooms around it.",
            "A doorway that fits the rest of the place lifts your home or workplace. You don’t need a huge setup.",
          ],
        },
        {
          title: "Diwali Balloon Decoration",
          body: [
            "Want something bright and fun? Diwali balloon decoration gives you coordinated balloon arches, festive backdrops, and installations that look great in photos. They suit home gatherings, corporate parties, and festive events.",
            "Choose a colour palette that matches your venue and other decorations. Then it looks like one plan, not a pile of random things.",
          ],
        },
      ],
    },
    {
      eyebrow: "Corporate Diwali",
      heading: "Diwali Decoration Themes for Offices and Corporate Events",
      intro: [
        "A corporate Diwali party should feel festive. It should also still feel like your office. The right colours, backdrop, lights, and entrance décor make employees, clients, and visitors feel welcome.",
        "Here are some Diwali decoration themes for the office to get you started.",
      ],
      items: [
        {
          title: "Traditional Floral Theme",
          body: [
            "Classic never gets old. Office decor items like Marigold-style garlands, flower arrangements, traditional decor and warm lighting add festive charm. It's ideal for reception areas, employee celebration rooms, and corporate events.",
          ],
        },
        {
          title: "Elegant Gold and Warm-Light Theme",
          body: [
            "Want something more polished? Gold accents, coordinated backdrops, and warm lighting give a sophisticated look. It’s good for modern offices that want festive décor to feel refined and fit their interiors.",
          ],
        },
        {
          title: "Colourful Balloon Theme",
          body: [
            "Want the mood cheerful? Coordinated balloons, festive arches, and a photo backdrop do it. This works for employee celebrations, office parties, and relaxed team get-togethers.",
          ],
        },
        {
          title: "Contemporary Corporate Theme",
          body: [
            "Go for clean styling, matching colours, subtle festive touches, and a branded backdrop if it makes sense. This gives you Diwali office decor that celebrates the festival while still looking professional.",
          ],
        },
        {
          title: "Festive Photo-Backdrop Theme",
          body: [
            "Give people a proper photo spot. Decorative backdrops, flowers, balloons, and lights all help. Employees and guests will use it, and they’ll remember the day.",
          ],
        },
      ],
      outro: [
        "Searching for Diwali decoration ideas for office? Think about your space, your team size, your brand, and what you plan to do on the day. Then choose a theme.",
      ],
    },
    {
      eyebrow: "Festival of Lights",
      heading: "Diwali Decoration Lighting Ideas for Every Space",
      intro: [
        "Diwali is the festival of lights, so lighting matters. Glowing entrances and lit-up backdrops add warmth and make the small details stand out. They also make evening celebrations feel inviting.",
        "Our Diwali decoration services include lighting concepts for residences, businesses, retail stores, and event venues.",
      ],
      bullets: [
        {
          label: "Home Lighting",
          text: "Warm string lights and decorative illumination for balconies, entrances, and a few indoor spots.",
        },
        {
          label: "Office Lighting",
          text: "Lights for reception areas, celebration backdrops, and special festive zones.",
        },
        {
          label: "Shop and Showroom Lighting",
          text: "Lights that work with entrances and displays without hiding the products.",
        },
        {
          label: "Event Lighting",
          text: "Decorative lighting that matches the main backdrop and the venue styling.",
        },
      ],
      outro: [
        "Looking up Diwali decoration light ideas, Diwali decoration lights ideas, or Diwali lights ideas? Choose options that fit your space and your theme. Good lighting decoration for Diwali works with flowers, balloons, and other features. It shouldn’t make the setup feel crowded.",
      ],
      cta: "Ready to discuss your setup?",
    },
    {
      eyebrow: "Where We Work",
      heading: "Locations We Serve for Diwali Decoration",
      intro: [
        "Planning your celebration in a particular city? Humsafar Event decorates homes, offices, retail spaces, and celebration venues across selected locations. Read the city notes below, then contact our team to confirm service for your address and your event.",
      ],
      items: [
        {
          title: "Diwali Decoration Services in Delhi",
          body: [
            "Make your festival special with Diwali Decoration Services in Delhi for homes, offices, shops, and event venues. We can do floral entrances, decorative lighting, festive backdrops, and corporate celebration setups. We’ll tailor them to your space, theme, and needs.",
          ],
        },
        {
          title: "Diwali Decoration Services in Gurugram",
          body: [
            "Need Diwali Decoration Services in Gurugram? We do festive home décor, corporate office styling, and retail decoration. That includes elegant floral arrangements, balloon installations, and decorative lighting. Tell us about your venue and plans, and we’ll talk through a setup that suits them.",
          ],
        },
        {
          title: "Diwali Decoration Services in Noida",
          body: [
            "Get ready for the festive season with Diwali Decoration Services in Noida for homes, workplaces, showrooms, and Diwali parties. You’ll find traditional entrance décor, contemporary backdrops, and coordinated lighting. The idea is to create a welcoming atmosphere for guests, employees, and customers.",
          ],
        },
        {
          title: "Diwali Decoration Services in Faridabad",
          body: [
            "Celebrate the Diwali festival with a festive mood and make it special with the help of the Diwali Decoration Services in Faridabad. We offer decorative lighting, floral entrances, balloon arrangements and themed backdrops. Choose what will fit your space and desired décor.",
          ],
        },
        {
          title: "Diwali Decoration Services in Ghaziabad",
          body: [
            "Decorate festive occasions, workplaces, and retail spaces with Diwali Decoration Services in Ghaziabad. It includes welcoming entrances, floral accents, colourful backdrops, and decorative lights. They get your space ready for the season.",
          ],
        },
        {
          title: "Diwali Decoration Services in Chandigarh",
          body: [
            "Thinking of a festive makeover with Diwali Decoration Services in Chandigarh? Decorations for homes, offices, and celebration venues is what we offer. This includes flower arrangements, decorative lighting, and matching backdrops. Call Humsafar Event to make sure we can get to your place.",
          ],
        },
        {
          title: "Diwali Decoration Services in Jaipur",
          body: [
            "Decorate homes, workplaces, shops and event spaces with Diwali Décor Services in Jaipur. Choose traditional themed flower arrangements or modern festive designs, depending on the function. We are here to help you understand your needs and know what services are available in your area.",
          ],
        },
      ],
    },
    {
      eyebrow: "Why Humsafar Event",
      heading: "Why Choose Humsafar Event for Diwali Decoration?",
      intro: [
        "Festive prep should get easier. It shouldn’t turn into one more thing on your list. Humsafar Event helps you look at designs for different spaces and compare your options. Then we plan a setup around what your celebration needs.",
      ],
      items: [
        {
          title: "Diwali Decoration Services for Different Spaces",
          body: [
            "Home, office, shop, showroom, or event venue. We have Diwali decoration services for each. Pick a setup that suits the occasion and still works in your venue.",
          ],
        },
        {
          title: "Customised Diwali Decoration Themes",
          body: [
            "Want traditional flowers, elegant backdrops, or colourful balloons? Browse the styles and talk a theme through with us. We’ll consider your interiors, favourite colours, and festive plans.",
          ],
        },
        {
          title: "Professional Diwali Office Decor",
          body: [
            "Plan a workplace celebration that looks pulled together. Our Diwali decor office options cover receptions, common areas, and festive gatherings. Select décor that will reflect your brand and make employees and guests feel welcome.",
          ],
        },
        {
          title: "Creative Diwali Door Decor and Entrances",
          body: [
            "Make it a centre of attention when you arrive. All help with floral arrangements, festive hangings, decorative arches, and lighting accents. Check out Diwali door decoration and entrance decor that match your home or office's festive theme.",
          ],
        },
        {
          title: "Convenient Decoration Selection and Booking",
          body: [
            "Browse the collection, compare designs and listed prices, and tell us what you need. Talk through your event date, location, preferred setup, and budget before you confirm the booking.",
          ],
        },
      ],
    },
    {
      eyebrow: "Book Now",
      heading: "Book Your Diwali Decoration Today",
      intro: [
        "Make festive prep a little easier with Humsafar Event’s Diwali decoration services. You might need home décor, corporate styling, showroom decoration, or just a good-looking entrance. Browse the designs and tell us what you have in mind.",
        "Send us your location, event date, preferred theme, and requirements. We’ll go over what suits you and confirm availability.",
        "Explore the Diwali collection and contact Humsafar Event to plan your festive decoration.",
      ],
      cta: "Get a free quote",
    },
  ],
  faqs: [
    {
      q: "What do Diwali decoration services include?",
      a: "This will depend on the design you choose. These can range from floral creations to entrance decoration, decorative lights, balloon displays, event backdrops and even home, office, shop and venue styling. Before you book, read the fine print and confirm what is included and the cost.",
    },
    {
      q: "Can I book Diwali office decoration for my workplace?",
      a: "Yes. You can ask about decoration for reception areas, common spaces, employee photo zones, and corporate celebrations. Tell us your location, theme, installation times, and budget, and we’ll discuss what works.",
    },
    {
      q: "Do you provide Diwali decoration for shops and showrooms?",
      a: "Discuss seasonal arrangements for retail spaces. This includes entrances, thematic displays, festive lighting and matching decorations. We can arrange it to suit your store layout, brand look, and customer flow.",
    },
    {
      q: "Can I customise my Diwali decoration theme?",
      a: "Yes. Talk to Humsafar Event about your colours, venue, theme, and decoration needs. What’s available depends on the design you choose, the location, the event date, and the setup.",
    },
    {
      q: "Where are Diwali decoration services available?",
      a: "Decoration options are available for Delhi NCR, Chandigarh and Jaipur. Call Humsafar Event to check availability, design, and installation for your specific location.",
    },
    {
      q: "How can I book Diwali decoration services?",
      a: "Browse the available designs and get in touch with Humsafar Event. Please share with us your event date, venue, venue type and preferred decoration style. Check availability, pricing, inclusions and installation before committing to booking.",
    },
  ],
};

const CONTENT_BY_CITY_SLUG: Record<string, LocationContent> = {};

const CONTENT_BY_CATEGORY_SLUG: Record<string, LocationContent> = {
  diwali: DIWALI,
};

export function getLocationContent(slug: string): LocationContent | null {
  return CONTENT_BY_CITY_SLUG[slug] ?? null;
}

export function getCategoryContent(slug: string): LocationContent | null {
  return CONTENT_BY_CATEGORY_SLUG[slug] ?? null;
}
