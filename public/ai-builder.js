/* AI page builder + on-page editing.
 * The AI never writes HTML. It returns a small JSON "spec": which sections (from the industry's section types),
 * which of the 10 designs and 3 positions, 3 colour themes, the text, table data and photo search words.
 * All designs are hard-coded below, so pages are consistent and cheap models work fine.
 * A page is a one-page website: menu bar (links scroll to sections), hero, content sections, footer.
 * Editing happens on the page: hover a section for its tools, click text to type, click a photo to change it,
 * hover a link to see or change where it goes.
 */
(function () {
  const MIN_CONTENT = 2, MAX_CONTENT = 7; // hero + content sections; the menu bar and footer are always there
  const HEAD_FONTS = ['Poppins', 'Inter', 'Montserrat', 'Nunito', 'Lora', 'Merriweather', 'Playfair Display'];
  const BODY_FONTS = ['Inter', 'Open Sans', 'Nunito', 'Lato'];
  const SHAPES = { rounded: 8, pill: 999, square: 2 }; // button corners
  const RADIUS = { square: 0, soft: 10, round: 24 };   // photo corners
  const FIXED = new Set(['nav', 'hero', 'footer']);    // stay in place
  const YEAR = new Date().getFullYear();

  // ---------- section types ----------
  const TYPEINFO = {
    nav:      { name: 'Menu bar',      icon: '☰',  desc: 'Logo and menu links at the top' },
    hero:     { name: 'Top banner',    icon: '🏠', desc: 'Big title, short line and a button' },
    about:    { name: 'About us',      icon: '👋', desc: 'Who you are, with a photo', label: 'About' },
    features: { name: 'Services',      icon: '⭐', desc: 'Three to six things you offer', label: 'Services' },
    steps:    { name: 'Steps',         icon: '🔢', desc: 'Numbered steps, how it works', label: 'How it works' },
    table:    { name: 'Table',         icon: '📋', desc: 'Rows and columns: timetable, prices, comparison', label: 'Details' },
    gallery:  { name: 'Photos',        icon: '🖼️', desc: 'A group of photos you can add to', label: 'Photos' },
    offer:    { name: 'Coupon',        icon: '🎁', desc: 'A discount with a coupon code', label: 'Offer' },
    prices:   { name: 'Price list',    icon: '💶', desc: 'Menu, tickets or plans with prices', label: 'Prices' },
    product:  { name: 'Product',       icon: '🛍️', desc: 'One item with photo, price and button', label: 'Product' },
    stats:    { name: 'Key numbers',   icon: '📈', desc: 'Three or four big numbers', label: 'Numbers' },
    reviews:  { name: 'Reviews',       icon: '💬', desc: 'What customers say', label: 'Reviews' },
    hours:    { name: 'Opening hours', icon: '🕑', desc: 'Days and times you are open', label: 'Hours' },
    event:    { name: 'Event',         icon: '📅', desc: 'Date, time and place', label: 'Event' },
    team:     { name: 'Team',          icon: '👥', desc: 'Three people with photos', label: 'Team' },
    faq:      { name: 'Questions',     icon: '❓', desc: 'Common questions and answers', label: 'FAQ' },
    cta:      { name: 'Call to action', icon: '📣', desc: 'A strong line with one big button', label: 'Get started' },
    contact:  { name: 'Contact',       icon: '📞', desc: 'Phone, email and address', label: 'Contact' },
    footer:   { name: 'Footer',        icon: '⬇️', desc: 'Name, links and contact at the bottom' }
  };
  const MENU_DEFAULT = new Set(['about', 'features', 'steps', 'table', 'offer', 'prices', 'product', 'hours', 'event', 'team', 'faq', 'contact']);
  const GALLERY = { min: 1, max: 12 }; // photos in a gallery; visitors add, move and remove them
  const IMG_COUNT = { nav: 0, hero: 1, about: 1, features: 1, steps: 1, table: 0, gallery: 4, offer: 1, prices: 1, product: 1, stats: 0, reviews: 0, hours: 1, event: 1, team: 3, faq: 0, cta: 1, contact: 0, footer: 0 };
  const ARR_LIMITS = { 'features.items': [3, 6], 'steps.items': [3, 6], 'prices.items': [2, 8], 'reviews.items': [2, 3], 'faq.items': [2, 6], 'hours.rows': [1, 7], 'about.stats': [0, 3], 'team.items': [3, 3], 'stats.items': [2, 4] };
  const ITEMS = { features: 'items', steps: 'items', prices: 'items', reviews: 'items', faq: 'items', hours: 'rows', about: 'stats', stats: 'items' };

  const DEF = {
    nav: { logo: '{name}', tagline: '', cta: 'Call us', link: '', phone: '+1 555 0100', email: 'hello@example.com', logoImg: '' },
    hero: { badge: '', heading: '{name}', sub: 'Friendly, honest service you can rely on.', cta: 'Learn more', link: '#contact', cta2: '', link2: '#about' },
    about: { heading: 'About us', text: 'We are a dedicated team that has served our community for many years. We listen, explain clearly and take good care of every customer.',
      stats: [{ num: 'Since 1995', label: 'Family business' }, { num: '7 days', label: 'A week open' }, { num: '100%', label: 'Personal service' }] },
    features: { heading: 'What we offer', items: [
      { icon: '⭐', title: 'Quality', text: 'Carefully made, with attention to every detail.' },
      { icon: '🕑', title: 'On time', text: 'We keep our promises and respect your time.' },
      { icon: '🤝', title: 'Trusted', text: 'Customers come back to us year after year.' }] },
    steps: { heading: 'How it works', items: [
      { title: 'Get in touch', text: 'Call us or drop by. We are happy to help.' },
      { title: 'We make a plan', text: 'We explain your options clearly, with no surprises.' },
      { title: 'We get it done', text: 'Carefully and on time, just as agreed.' }] },
    table: { heading: 'Timetable', intro: '', cols: ['Day', 'Time', 'What'], rows: [['Monday', '10:00', 'Opening'], ['Wednesday', '14:00', 'Guided tour'], ['Saturday', '11:00', 'Family morning']], note: '' },
    gallery: { heading: 'Take a look' },
    offer: { heading: 'Special offer', offer: '20% OFF', code: 'SAVE20', terms: 'Show this code at the checkout.', expiry: 'Valid until 31 December ' + YEAR },
    prices: { heading: 'Prices', items: [
      { name: 'Basic', desc: 'Everything you need to get started', price: '€25' },
      { name: 'Standard', desc: 'Our most popular choice', price: '€45' },
      { name: 'Complete', desc: 'All included, nothing to worry about', price: '€75' }], note: 'All prices include tax.' },
    product: { heading: 'Product name', sub: 'A short detail about it', price: '€49', text: 'Describe what makes this item special in one or two sentences.', cta: 'Buy now', link: '#contact' },
    stats: { heading: '', items: [{ num: '25+', label: 'Years of experience' }, { num: '1,000+', label: 'Happy customers' }, { num: '7 days', label: 'A week open' }] },
    reviews: { heading: 'What our customers say', items: [
      { quote: 'Write a short review from a real customer here.', name: 'Customer name' },
      { quote: 'Another happy customer can share their experience here.', name: 'Customer name' },
      { quote: 'Real reviews help new visitors trust you.', name: 'Customer name' }] },
    hours: { heading: 'Opening hours', rows: [{ day: 'Monday – Friday', time: '9:00 – 18:00' }, { day: 'Saturday', time: '10:00 – 16:00' }, { day: 'Sunday', time: 'Closed' }], note: 'Open on most public holidays.' },
    event: { heading: 'Join us', date: 'Saturday 12 December ' + YEAR, time: '18:00 – 22:00', place: 'Grand Hall, 123 Main Street', text: 'An evening of good company. Everyone is welcome.', cta: 'Book your seat', link: '#contact' },
    team: { heading: 'Meet our team', items: [{ name: 'Anna Smith', role: 'Founder' }, { name: 'David Brown', role: 'Manager' }, { name: 'Maria Garcia', role: 'Customer care' }] },
    faq: { heading: 'Questions & answers', items: [
      { q: 'Do I need to book in advance?', a: 'It is not required, but booking means we can be ready for you.' },
      { q: 'How can I pay?', a: 'We accept cash and all major cards.' },
      { q: 'Is there parking nearby?', a: 'Yes, there is free parking right outside.' }] },
    cta: { heading: 'Ready when you are', sub: 'Call us today — we are happy to help.', cta: 'Contact us', link: '#contact' },
    contact: { heading: 'Contact us', text: 'We are happy to help. Call us or drop by.', phone: '+1 555 0100', email: 'hello@example.com', address: '123 Main Street, Your City', cta: 'Call us', link: '' },
    footer: { brand: '{name}', tagline: 'Thank you for visiting.', phone: '+1 555 0100', email: 'hello@example.com', copy: `© ${YEAR} {name}. All rights reserved.` }
  };

  // ---------- industries: each has its own section types (plus menu bar, hero, call to action, footer) ----------
  const INDUSTRIES = {
    'Company profile': { types: ['about', 'features', 'steps', 'stats', 'team', 'reviews', 'table', 'faq', 'contact'], order: ['about', 'features', 'contact'],
      def: { features: { heading: 'Our services' }, steps: { heading: 'How we work' }, table: { heading: 'Our services at a glance', menuLabel: 'Overview', cols: ['Service', 'For whom', 'Starting from'], rows: [['Consulting', 'Small businesses', '€90 / hour'], ['Project management', 'Growing teams', 'On request'], ['Maintenance', 'All customers', '€40 / month']] } } },
    'Museum Art': { types: ['product', 'about', 'gallery', 'event', 'hours', 'table', 'reviews', 'contact'], order: ['product', 'about', 'hours', 'contact'],
      def: { product: { heading: 'Pots of Tulips', sub: 'Claude Monet', price: '€195,-', text: 'A museum-quality print on heavy cotton paper, made to last for generations.', cta: 'Buy now', menuLabel: 'Artwork' },
        about: { heading: 'About the artist', menuLabel: 'Artist', text: 'Claude Monet (1840 – 1926) was a French painter and a founder of Impressionism, known for his light, colour and gardens.', stats: [] }, gallery: { heading: 'In the collection' }, event: { heading: 'Current exhibition', menuLabel: 'Exhibition' },
        table: { heading: 'Ticket prices', menuLabel: 'Tickets', cols: ['Ticket', 'Price', 'Note'], rows: [['Adults', '€17', ''], ['Seniors (65+)', '€12', 'Please show ID'], ['Under 18', 'Free', '']] } } },
    'Tourism': { types: ['about', 'gallery', 'features', 'hours', 'table', 'event', 'faq', 'contact'], order: ['about', 'gallery', 'table', 'contact'],
      def: { about: { heading: 'Welcome', text: 'Discover the old harbour with a friendly local guide. Easy walks, good stories and plenty of time for photos.', stats: [] }, features: { heading: 'Highlights', menuLabel: 'Highlights' }, event: { heading: 'Guided tours', menuLabel: 'Tours' }, contact: { heading: 'How to get here', cta: 'Get directions', menuLabel: 'Directions' },
        table: { heading: 'Tour times', menuLabel: 'Tours', cols: ['Tour', 'Starts', 'Length'], rows: [['Morning walk', '10:00', '1½ hours'], ['Afternoon tour', '14:00', '2 hours'], ['Evening tour', '19:00', '1½ hours']] } } },
    'Instructions': { types: ['features', 'steps', 'table', 'gallery', 'faq', 'about', 'product', 'contact'], order: ['features', 'steps', 'faq'],
      def: { features: { heading: 'What you need', menuLabel: 'You need', items: [{ icon: '🔧', title: 'Tools', text: 'A screwdriver or Allen key.' }, { icon: '📦', title: 'All parts', text: 'Check the parts list first.' }, { icon: '⏱️', title: 'Time', text: 'About 30 to 60 minutes.' }] },
        steps: { heading: 'Step by step', menuLabel: 'Steps', items: [
          { title: 'Unpack and check', text: 'Lay all parts on a soft blanket and compare them with the parts list.' },
          { title: 'Build the frame', text: 'Join the side panels and the back panel. Turn the screws in by hand first.' },
          { title: 'Add the shelves', text: 'Slide each shelf onto its pins, then tighten every screw.' },
          { title: 'Fix it to the wall', text: 'Use the wall bracket so the shelf cannot tip over.' }] },
        faq: { heading: 'Having trouble?', menuLabel: 'Help' }, about: { heading: 'Good to know', text: 'Read every step once before you start, and keep small parts in a bowl so nothing gets lost. Ask a helper for the heavy parts.', stats: [] }, product: { heading: 'Spare parts' }, contact: { heading: 'Need help?' },
        table: { heading: 'Parts list', menuLabel: 'Parts', cols: ['Part', 'How many', 'Note'], rows: [['Side panel', '2', ''], ['Shelf', '4', ''], ['Screw M6', '16', 'In the small bag']] } } },
    'Coupon': { types: ['offer', 'product', 'features', 'hours', 'gallery', 'reviews', 'faq', 'contact'], order: ['offer', 'hours', 'contact'],
      def: { features: { heading: 'Why shop with us' }, faq: { heading: 'How to use your coupon', menuLabel: 'How to use', items: [
        { q: 'How do I use the code?', a: 'Show this page at the checkout, or type the code when you pay online.' },
        { q: 'Can I use it more than once?', a: 'The code works once per customer.' },
        { q: 'Can I combine it with other offers?', a: 'This offer cannot be combined with other discounts.' }] } } },
    'Restaurant': { types: ['prices', 'offer', 'gallery', 'about', 'reviews', 'hours', 'event', 'table', 'contact'], order: ['prices', 'gallery', 'hours', 'contact'],
      def: { prices: { heading: 'Our menu', menuLabel: 'Menu', items: [{ name: 'Soup of the day', desc: 'Served with fresh bread', price: '€6' }, { name: 'Margherita pizza', desc: 'Tomato, mozzarella and basil', price: '€11' }, { name: 'Grilled salmon', desc: 'With vegetables and potatoes', price: '€18' }, { name: 'Tiramisu', desc: 'Our house dessert', price: '€6' }], note: 'Please tell us about any allergies.' },
        about: { heading: 'Our story' }, event: { heading: 'Special evening' }, contact: { heading: 'Book a table', cta: 'Call to book' },
        table: { heading: 'Allergy guide', menuLabel: 'Allergies', cols: ['Dish', 'Gluten', 'Dairy', 'Nuts'], rows: [['Margherita pizza', 'Yes', 'Yes', 'No'], ['Grilled salmon', 'No', 'No', 'No'], ['Tiramisu', 'Yes', 'Yes', 'No']] } } },
    'Event': { types: ['event', 'about', 'table', 'team', 'gallery', 'prices', 'faq', 'contact'], order: ['event', 'table', 'contact'],
      def: { team: { heading: 'Speakers' }, about: { heading: 'About the event', text: 'A friendly evening with music, good company and something for everyone. Doors open half an hour early.', stats: [] },
        prices: { heading: 'Tickets', menuLabel: 'Tickets', items: [{ name: 'Adult', desc: '', price: '€15' }, { name: 'Senior (65+)', desc: '', price: '€10' }, { name: 'Child under 12', desc: '', price: 'Free' }], note: 'Tickets are also sold at the door.' },
        table: { heading: 'Programme', menuLabel: 'Programme', cols: ['Time', 'What', 'Where'], rows: [['18:00', 'Doors open', 'Main hall'], ['18:30', 'Welcome', 'Main stage'], ['19:00', 'Concert', 'Main stage'], ['21:30', 'Drinks', 'Garden']] } } },
    'Real estate': { types: ['product', 'gallery', 'features', 'table', 'about', 'event', 'team', 'contact'], order: ['product', 'gallery', 'table', 'contact'],
      def: { product: { heading: 'Family home with garden', sub: '3 bedrooms · 2 bathrooms · 140 m²', price: '€385,000', text: 'A bright, well-kept home in a quiet street close to shops and schools.', cta: 'Book a viewing', menuLabel: 'The home' },
        features: { heading: 'Features' }, about: { heading: 'The neighbourhood', menuLabel: 'Area', text: 'A quiet, green street with shops, schools, a park and the bus stop all within a short walk.', stats: [] },
        event: { heading: 'Open house', menuLabel: 'Viewing', text: 'Come and see the home. No appointment needed; we will show you around.', cta: 'Book a viewing', place: '12 Oak Street' }, team: { heading: 'Your agent', menuLabel: 'Agent' },
        table: { heading: 'Property details', menuLabel: 'Details', cols: ['Feature', 'Detail'], rows: [['Bedrooms', '3'], ['Bathrooms', '2'], ['Living area', '140 m²'], ['Garden', 'Yes, facing south'], ['Parking', 'Private driveway']] } } },
    'Healthcare': { types: ['features', 'about', 'team', 'hours', 'table', 'steps', 'faq', 'contact'], order: ['features', 'hours', 'contact'],
      def: { features: { heading: 'Our care', menuLabel: 'Care' }, team: { heading: 'Our doctors', menuLabel: 'Doctors' }, steps: { heading: 'Your visit', menuLabel: 'Your visit', items: [
          { title: 'Book your appointment', text: 'Call us or drop by the desk. We will find a time that suits you.' },
          { title: 'Bring your card', text: 'Please bring your health card and a list of any medicines you take.' },
          { title: 'See your doctor', text: 'Your doctor will take time to listen and explain everything clearly.' }] }, contact: { heading: 'Make an appointment', cta: 'Call to book' },
        table: { heading: 'Consultation fees', menuLabel: 'Fees', cols: ['Service', 'Length', 'Price'], rows: [['First visit', '30 min', '€60'], ['Follow-up visit', '15 min', '€35'], ['Home visit', '30 min', '€90']] } } },
    'Education': { types: ['features', 'about', 'table', 'steps', 'team', 'event', 'faq', 'contact'], order: ['features', 'table', 'contact'],
      def: { features: { heading: 'Our courses', menuLabel: 'Courses' }, steps: { heading: 'How to enrol', menuLabel: 'Enrol', items: [
          { title: 'Choose a course', text: 'Look at the timetable and pick the class that suits you.' },
          { title: 'Sign up', text: 'Call us or visit the front desk. We will help you fill in the form.' },
          { title: 'Start learning', text: 'Come to your first class. Everyone is welcome, beginners too.' }] }, team: { heading: 'Our teachers', menuLabel: 'Teachers' }, event: { heading: 'Open day' },
        table: { heading: 'Class timetable', menuLabel: 'Timetable', cols: ['Day', 'Class', 'Time'], rows: [['Monday', 'English for beginners', '10:00 – 11:30'], ['Wednesday', 'Computer basics', '14:00 – 15:30'], ['Friday', 'Conversation club', '18:00 – 19:00']] } } },
    'Technology': { types: ['features', 'steps', 'stats', 'prices', 'table', 'reviews', 'faq', 'contact'], order: ['features', 'steps', 'table', 'faq', 'contact'],
      def: { features: { heading: 'Features', menuLabel: 'Features' }, steps: { heading: 'How it works', items: [
          { title: 'Sign up', text: 'Create your account in a few minutes. No technical skills needed.' },
          { title: 'Add your team', text: 'Invite the people you work with by email.' },
          { title: 'Get organised', text: 'Plan your tasks together and see what is done at a glance.' }] },
        prices: { heading: 'Pricing', menuLabel: 'Pricing', items: [{ name: 'Starter', desc: 'For one person', price: '€9 / month' }, { name: 'Team', desc: 'For small teams', price: '€29 / month' }, { name: 'Business', desc: 'For growing companies', price: '€79 / month' }], note: 'Cancel any time.' },
        faq: { heading: 'Questions & answers', items: [
          { q: 'How do I get started?', a: 'Create your account and follow the short welcome guide.' },
          { q: 'Can I change my plan later?', a: 'Yes, you can move to another plan when you need to.' },
          { q: 'How do I get help?', a: 'Email or call our support team. We are happy to help.' }] },
        table: { heading: 'Compare plans', menuLabel: 'Compare', cols: ['Feature', 'Starter', 'Team', 'Business'], rows: [['Users', '1', '10', 'Unlimited'], ['Storage', '10 GB', '100 GB', '1 TB'], ['Support', 'Email', 'Email and chat', 'Phone, 24/7']] } } }
  };
  const indOf = st => INDUSTRIES[st?.ind] || INDUSTRIES['Company profile'];
  // Concrete photo words per industry (used when the AI gives none, and for demo pages): concrete words find far better photos
  const PICS = {
    'Company profile': ['modern office', 'business meeting', 'office team', 'city skyline'],
    'Museum Art': ['oil painting', 'art museum gallery', 'marble sculpture', 'museum hall'],
    'Tourism': ['famous landmark', 'old town street', 'mountain lake', 'harbour boats'],
    'Instructions': ['tools workbench', 'screwdriver', 'toolbox', 'workshop'],
    'Coupon': ['gift box', 'shop window', 'shopping bags', 'boutique interior'],
    'Restaurant': ['pizza', 'pasta dish', 'restaurant interior', 'tiramisu'],
    'Event': ['concert hall', 'conference audience', 'stage lights', 'celebration party'],
    'Real estate': ['house exterior', 'living room', 'modern kitchen', 'garden'],
    'Healthcare': ['doctor', 'clinic waiting room', 'stethoscope', 'hospital'],
    'Education': ['classroom', 'library books', 'students studying', 'school building'],
    'Technology': ['laptop', 'software developer', 'smartphone app', 'data center']
  };

  // ---------- 10 designs per section; each also has 3 positions (left, center, right) = 30 looks ----------
  const NAV_DESIGNS = ['Simple white', 'White with button', 'Colour bar', 'Classic, lines above and below', 'Contact strip on top',
    'Floating rounded bar', 'Underlined links', 'Colour bar with tagline and button', 'Light grey, small capitals', 'Big logo, links on a colour strip'];
  const HERO_DESIGNS = ['Solid colour', 'Text and photo right', 'Photo left and text', 'Full background photo',
    'Colour band, photo below', 'White card on photo', 'Simple with accent line', 'Round photo above text',
    'Photo in a light frame', 'Wide photo below text'];
  const LAYOUTS = {
    about:    ['Photo left, text right', 'Text left, photo right', 'Centered with key facts', 'Photo on top', 'Large quote', 'Photo and text in one card', 'Card over a wide photo', 'Big facts on top', 'Big title left, text right', 'Round photo beside text'],
    features: ['Three columns', 'Icon list', 'Photo left, list right', 'List left, photo right', 'Numbered list', 'Cards with colour line', 'Two-column checklist', 'Colour block', 'Wide photo, cards below', 'Big icons, alternating sides'],
    steps:    ['Numbered list', 'Numbered columns', 'Timeline', 'Photo and steps', 'Big numbers', 'Row with arrows', 'Step cards', 'Zigzag cards', 'Colour block with big numbers', 'Wide photo, two-column steps'],
    table:    ['Clean lines', 'Striped rows', 'Coloured header', 'Full grid', 'Highlighted first column', 'Soft card', 'One card per row', 'Comparison with ticks', 'Simple list', 'Shaded columns'],
    gallery:  ['Two per row', 'Four per row', 'One big, others small', 'Rows of three', 'Swipe row', 'Mosaic', 'Photo prints', 'Round photos', 'Big photo, small ones below', 'Big title beside grid'],
    offer:    ['Dashed ticket', 'Big code', 'Photo and offer', 'Colour banner', 'Round badge', 'Gift card', 'Cut-out coupon', 'On a photo', 'Very big offer', 'Card with corner ribbon'],
    prices:   ['List with dots', 'Table', 'Two columns', 'Price cards', 'Photo and list', 'Menu board', 'Price tags', 'Plans, middle highlighted', 'Price first', 'Soft tiles'],
    product:  ['Photo on top', 'Photo left', 'Photo right', 'Photo in a frame', 'Price on the photo', 'Card on the photo', 'Price box', 'Big round photo', 'Photo beside colour panel', 'Compact card'],
    stats:    ['Numbers with lines', 'Numbers in circles', 'Colour band', 'Underlined numbers', 'Title left, numbers right', 'Cards with colour edge', 'Stacked list', 'Soft tiles', 'Accent band', 'Outlined boxes'],
    reviews:  ['Three cards', 'One big quote', 'List with line', 'Quote marks', 'Speech bubbles', 'Colour cards', 'Cards with name circle', 'Wide rows', 'Paper notes', 'Outlined with quote badge'],
    hours:    ['Simple table', 'List with dots', 'Two columns', 'Photo and hours', 'Colour block', 'Day tiles', 'Big clock beside list', 'Rounded rows', 'Card on a photo', 'Big times'],
    event:    ['Date block', 'Icon list', 'Photo and details', 'Colour banner', 'Ticket', 'On a photo', 'Three info cards', 'Poster', 'Card over a wide photo', 'Colour side panel'],
    team:     ['Round photos', 'Photo cards', 'List', 'Two columns', 'Swipe row', 'Name on the photo', 'Framed photos', 'First person large', 'Photos with colour ring', 'Black-and-white photos'],
    faq:      ['Simple list', 'Question boxes', 'Two columns', 'Numbered', 'Q and A labels', 'Fold-out answers', 'Chat bubbles', 'Colour question bars', 'Title left, questions right', 'Big question marks'],
    cta:      ['Colour band', 'Text left, button right', 'Photo background', 'Big and simple', 'Card with side line', 'Text beside a photo', 'Outlined box', 'Title with button strip', 'Big pointing icon', 'Lines above and below'],
    contact:  ['Centered', 'Two columns', 'Icon list', 'Colour banner', 'Call and email buttons', 'Three info cards', 'With map button', 'Big phone number', 'Colour side panel', 'Business card'],
    footer:   ['Centered', 'Name left, links right', 'Three columns', 'Big name', 'One line', 'Light, centered', 'Light, name and contact', 'With big call button', 'Tagline band', 'Minimal, light']
  };
  const designName = (type, v) => type === 'hero' ? HERO_DESIGNS[v - 1] : type === 'nav' ? NAV_DESIGNS[v - 1] : LAYOUTS[type][v - 1];

  // Complete themes: colours + heading font + body font + button shape. secondary = very light tint of primary.
  const BASE_THEMES = [
    { name: 'Classic Navy',    primary: '#1f3a5f', secondary: '#e3e9f1', accent: '#b0413e', bg: '#ffffff', surface: '#f6f4ee', text: '#1f2328', font: 'Lora', body: 'Open Sans', shape: 'rounded' },
    { name: 'Modern Indigo',   primary: '#3730a3', secondary: '#e0e7ff', accent: '#be185d', bg: '#ffffff', surface: '#f5f7ff', text: '#111827', font: 'Poppins', body: 'Inter', shape: 'pill' },
    { name: 'Fresh Green',     primary: '#166534', secondary: '#dcfce7', accent: '#c2410c', bg: '#ffffff', surface: '#f3f8f4', text: '#14211a', font: 'Nunito', body: 'Nunito', shape: 'rounded' },
    { name: 'Elegant Burgundy', primary: '#6d1f2f', secondary: '#f3e6e8', accent: '#8a5a00', bg: '#fffdfa', surface: '#f7f0ea', text: '#241a1b', font: 'Playfair Display', body: 'Lato', shape: 'square' },
    { name: 'Ocean Teal',      primary: '#0f5f73', secondary: '#dff3f6', accent: '#c2410c', bg: '#ffffff', surface: '#f2f8f9', text: '#10232a', font: 'Montserrat', body: 'Open Sans', shape: 'rounded' },
    { name: 'Charcoal & Gold', primary: '#2b2f36', secondary: '#ececec', accent: '#8a5a00', bg: '#ffffff', surface: '#f5f4f1', text: '#1d1f23', font: 'Merriweather', body: 'Lato', shape: 'square' }
  ];

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => $('<div>').html(s).text().trim();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = n => Math.floor(Math.random() * n);
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const isHex = v => /^#[0-9a-f]{6}$/i.test(v || '');
  const validTheme = p => p && ['primary', 'secondary', 'accent', 'bg', 'surface', 'text'].every(k => isHex(p[k]));
  const safeHref = h => { h = strip(h); return /^(https?:|#|tel:|mailto:)/i.test(h) ? h : (h ? 'https://' + h.replace(/^\/+/, '') : '#'); };
  const telOf = p => 'tel:' + strip(p).replace(/[^\d+]/g, '');
  const cssUrl = u => String(u).replace(/['"()\s]/g, encodeURIComponent);
  const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
  const setPath = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); const t = ks.reduce((a, k) => a?.[k], o); if (t && last in t) t[last] = v; };
  const merge = (a, b) => { const o = JSON.parse(JSON.stringify(a)); for (const k in b || {}) o[k] = JSON.parse(JSON.stringify(b[k])); return o; };
  const contentCount = () => state.sections.filter(s => s.type !== 'nav' && s.type !== 'footer').length;

  // WCAG contrast, so AI colours are always readable (white text on primary/accent, dark text on light backgrounds)
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const shade = (h, k) => hex(rgb(h).map(v => v * (1 - k)));
  const tint = (h, k) => hex(rgb(h).map(v => v + (255 - v) * k));
  function darken(h, against, min) { let k = 0; while (k < 1 && ratio(shade(h, k), against) < min) k += .05; return shade(h, Math.min(k, 1)); }
  function fixTheme(p, k) {
    const q = { ...BASE_THEMES[k % BASE_THEMES.length], ...p };
    if (lum(q.bg) < .85) q.bg = '#ffffff';
    if (lum(q.surface) < .78) q.surface = tint(q.primary, .93);
    if (lum(q.secondary) < .7) q.secondary = tint(q.primary, .86);
    q.primary = darken(q.primary, '#ffffff', 5.5);
    q.accent = darken(q.accent, '#ffffff', 4.6);
    q.text = darken(q.text, q.surface, 10);
    if (!HEAD_FONTS.includes(q.font)) q.font = BASE_THEMES[k % BASE_THEMES.length].font;
    if (!BODY_FONTS.includes(q.body)) q.body = 'Open Sans';
    if (!(q.shape in SHAPES)) q.shape = 'rounded';
    q.name = strip(q.name || 'Shade ' + (k + 1)).slice(0, 24);
    return q;
  }
  // three clearly different colour themes: keep the given ones, then add the base themes whose main colour differs most
  const hueOf = h => {
    const [r, g, b] = rgb(h).map(v => v / 255), hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
    if (d < .12) return null; // grey or charcoal: no real hue
    const x = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (x * 60 + 360) % 360;
  };
  const hueGap = (a, b) => { const x = hueOf(a.primary), y = hueOf(b.primary); if (x === null || y === null) return x === y ? 0 : 120; const d = Math.abs(x - y); return Math.min(d, 360 - d); };
  function distinctThemes(list) {
    const out = [...list];
    while (out.length < 3) {
      const gap = t => Math.min(...out.map(o => hueGap(t, o)));
      out.push(BASE_THEMES.filter(t => !out.some(o => o.name === t.name)).sort((a, b) => gap(b) - gap(a))[0]);
    }
    return out.slice(0, 3);
  }

  // ---------- images: Openverse first, Wikimedia Commons as backup, then random photos ----------
  const imgCache = {};
  function fetchT(url, ms) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));
  }
  // Only licences that allow business use and edits (CC0, public domain, CC BY, CC BY-SA). CC BY and BY-SA need the
  // photographer named, so those photos carry a credit that the footer prints.
  const credit = (by, licence) => /public domain|cc0|pdm|^pd/i.test(licence || '') ? null : { by: strip(by || '').slice(0, 60) || 'Unknown photographer', lic: licence };
  async function openverse(q, n = 12) {
    try {
      const j = await (await fetchT(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=${n}&mature=false&license_type=commercial,modification`, 6000)).json();
      return (j.results || []).map(x => ({ src: x.url, thumb: x.thumbnail, wide: (x.width || 4) >= (x.height || 3),
        credit: credit(x.creator, `CC ${String(x.license || '').toUpperCase()} ${x.license_version || ''}`.trim()) }));
    } catch (e) { return []; }
  }
  async function commonsSearch(query, n) {
    try {
      const j = await (await fetchT(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${n}&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=960&format=json&origin=*`, 8000)).json();
      return Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index)
        .map(p => p.imageinfo?.[0]).filter(ii => ii?.thumburl)
        .map(ii => ({ src: ii.thumburl, wide: ii.width >= ii.height, credit: credit(ii.extmetadata?.Artist?.value, ii.extmetadata?.LicenseShortName?.value) }));
    } catch (e) { return []; }
  }
  // Commons titles say what a photo shows, so photos with every search word in the title come first
  // (a plain text search also matches descriptions: "business meeting" once found a deer).
  // Curated "Quality images" lead within each group.
  async function commons(q, n = 12) {
    const inTitle = q.split(/\s+/).filter(Boolean).map(w => 'intitle:' + w).join(' ');
    const groups = await Promise.all([
      commonsSearch(`${inTitle} incategory:Quality_images filetype:bitmap`, n),
      commonsSearch(`${inTitle} filetype:bitmap`, n),
      commonsSearch(`${q} filetype:bitmap`, n)
    ]);
    const seen = new Set();
    return groups.flat().filter(x => !seen.has(x.src) && seen.add(x.src));
  }
  const picsum = (q, n = 12) => Array.from({ length: n }, (_, i) => ({ src: `https://picsum.photos/seed/${encodeURIComponent(q)}-${i}/900/600`, wide: true }));
  const wideFirst = l => [...l.filter(x => x.wide), ...l.filter(x => !x.wide)]; // landscape photos fit the layouts best
  function searchImages(q) { // cached promise, so parallel sections share one request
    return imgCache[q] || (imgCache[q] = openverse(q).then(l => l.length ? l : commons(q)).then(l => l.length ? wideFirst(l) : picsum(q)));
  }
  async function searchAll(q) { // the photo picker shows both libraries
    const [a, b] = await Promise.all([openverse(q, 16), commons(q, 16)]);
    return a.length + b.length ? wideFirst([...a, ...b]) : picsum(q, 16);
  }
  // 'ok', 'error' (broken link) or 'slow' (no answer in time; usually fine, just a busy connection)
  const loadState = (src, ms) => new Promise(res => {
    const i = new Image(); const t = setTimeout(() => res('slow'), ms);
    i.onload = () => { clearTimeout(t); res(i.naturalWidth > 50 ? 'ok' : 'error'); }; i.onerror = () => { clearTimeout(t); res('error'); }; i.src = src;
  });
  const canLoad = async (src, ms = 5000) => (await loadState(src, ms)) === 'ok';
  async function pickImage(q, used) { // → { src, credit }
    const list = (await searchImages(q)).filter(it => !used.has(it.src)).slice(0, 3); // best matches first
    let slow = null;
    for (const it of list) {
      used.add(it.src); // reserve now: other sections are picking in parallel
      for (const src of [it.src, it.thumb].filter(Boolean)) {
        const r = await loadState(src, 5000);
        if (r === 'ok') return { src, credit: it.credit || null };
        if (r === 'slow' && !slow) slow = { src, credit: it.credit || null };
      }
    }
    // a matching photo that is only slow beats a random one
    return slow || { src: `https://picsum.photos/seed/${encodeURIComponent(q)}-${rnd(999)}/900/600`, credit: null };
  }
  async function fillImages(sections, used = new Set()) {
    await Promise.all(sections.flatMap(s => s.imgs.map(async im => { if (!im.src) Object.assign(im, await pickImage(im.q, used)); })));
    // where a search found nothing: people get a neutral silhouette, other photos reuse a matching
    // photo from the same page rather than a random one
    const random = src => src.includes('picsum.photos');
    const good = sections.filter(s => s.type !== 'team').flatMap(s => s.imgs).filter(m => m.src && !random(m.src));
    let k = 0;
    for (const s of sections) for (const m of s.imgs) {
      if (!random(m.src)) continue;
      if (s.type === 'team') Object.assign(m, { src: SILHOUETTE, credit: null });
      else if (good.length) { const g = good[k++ % good.length]; Object.assign(m, { src: g.src, credit: g.credit }); }
    }
  }
  const SILHOUETTE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#e5e9ee"/><circle cx="150" cy="118" r="54" fill="#b7c0ca"/><path d="M52 300c8-62 50-96 98-96s90 34 98 96z" fill="#b7c0ca"/></svg>');

  // ---------- AI ----------
  const FIELDS = {
    nav: '"logo":"business name","tagline","cta":"short button label","link"',
    hero: '"badge":"optional short label above the title or empty","heading","sub","cta","link","cta2":"optional second button or empty","link2","imageQuery"',
    about: '"heading","text","stats":[{"num","label"}] (0-3; only real facts from the description, otherwise [])',
    features: '"heading","items":[{"icon":"one emoji","title","text"}] (3-6),"imageQuery"',
    steps: '"heading","items":[{"title","text"}] (3-6),"imageQuery"',
    table: '"heading","intro","cols":["",""] (2-5 short column names),"rows":[["",""]] (1-12 rows, one short text per column),"note"',
    gallery: '"heading","imageQueries":["",""] (3-8 different photo ideas)',
    offer: '"heading","offer":"e.g. 20% OFF","code","terms","expiry","imageQuery"',
    prices: '"heading","items":[{"name","desc","price"}] (2-8),"note","imageQuery"',
    product: '"heading":"item name","sub","price","text","cta","link","imageQuery"',
    stats: '"heading","items":[{"num","label"}] (2-4; only real numbers from the description)',
    reviews: '"heading","items":[{"quote","name"}] (2-3; example quotes for the owner to replace with real ones, name "Customer name")',
    hours: '"heading","rows":[{"day","time"}] (1-7; group days that share the same times, e.g. "Monday – Friday"),"note","imageQuery"',
    event: '"heading","date","time","place","text","cta","link","imageQuery"',
    team: '"heading","items":[{"name","role"}] (exactly 3)',
    faq: '"heading","items":[{"q","a"}] (2-6)',
    cta: '"heading","sub","cta","link","imageQuery"',
    contact: '"heading","text","phone","email","address","cta"',
    footer: '"brand","tagline"'
  };
  const AUDIENCE = `Audience and style:
- Many readers are older people. Use plain, warm, everyday words and short sentences. No slang, no hype, no jargon, no ALL CAPS.
- Button labels say exactly what happens: "Call us", "Visit us", "Book a table", "Buy now", "Get directions".
- Never invent prices, awards, statistics or reviews. Use real details from the description; use neutral placeholders like +1 555 0100 when missing.`;

  function systemPrompt(ind) {
    const middle = [...INDUSTRIES[ind].types, 'cta'];
    const types = ['nav', 'hero', ...middle, 'footer'];
    return `You design one-page websites that open when someone scans a QR code, usually on a phone.
You do NOT write HTML. You choose from fixed building blocks and write the text. Reply with ONE JSON object only, no markdown.

${AUDIENCE}

Page rules:
- Order: "nav" first, "hero" second, then 1 to ${MAX_CONTENT - 1} content sections, "footer" last. No type twice.
- Content section types for a "${ind}" page: ${middle.join(', ')}.
- Choose what this visitor needs most; fewer, useful sections beat many. Add "contact" whenever a phone, email or address is given, as the last content section.
- Use a "table" when information is naturally a grid: timetables, schedules, programmes, ticket or price comparisons, plan comparisons, specifications, parts lists, allergy guides. Keep cells short.
- Every content section has "menuLabel" (1-2 words for the top menu) and "menu" (true to show it in the top menu; at most 5 sections true).
- Every section has "design" (1-10) and "align" ("left", "center" or "right").
  Designs per type:
  ${types.map(t => `${t}: ${Array.from({ length: 10 }, (_, v) => `${v + 1} ${designName(t, v + 1)}`).join(', ')}`).join('\n  ')}
- Optional "background": "colour" for at most one content section to give the page rhythm.
- Page "corners" for photos: "square", "soft" or "round".
- Page look: "font" for headings (${HEAD_FONTS.join(', ')}), "body" font (${BODY_FONTS.join(', ')}) and button "shape" (rounded, pill or square).
- Give exactly 3 colour themes as "palettes" for the visitor to choose from. They must look clearly different from each other (each with a different main colour), and all suit this business; put the best fit first. Each: "name" (1-2 words, e.g. "Ocean Blue") and hex colours #rrggbb.
  primary: dark enough for white text. secondary: a very light tint of primary. accent: button colour, white text readable on it. bg: white or ivory. surface: a light grey or cream. text: near-black. No neon.
- Write in the same language as the description. Headings max 7 words, paragraphs max 35 words.
- "imageQuery": 1-3 simple English words for a stock photo that clearly shows this business (e.g. "pizza oven", "dentist chair").

Fields per section type:
  ${types.map(t => `${t}: ${FIELDS[t]}`).join('\n  ')}

JSON shape:
{"title":"","font":"","body":"","shape":"rounded","corners":"soft","palettes":[{"name":"","primary":"#","secondary":"#","accent":"#","bg":"#","surface":"#","text":"#"}, {...}, {...}],
"sections":[{"type":"nav","design":1,"align":"left", ...fields}, {"type":"hero", ...}, {"type":"...","menuLabel":"","menu":true, ...}, {"type":"footer", ...}]}`;
  }

  // AI runs on the server (api/ai.js), which holds the OpenRouter key; the browser only sends the prompt.
  let aiReady = null, lastRun = null; // lastRun: { name, ms, tokens } of the last answer
  const aiAvailable = () => aiReady ??= fetch('/api/ai').then(r => r.ok ? r.json() : {}).then(j => !!j.configured).catch(() => false);
  async function chat(system, user, temperature = 0.7) {
    let r;
    try { r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, user, temperature }) }); }
    catch (e) { throw new Error('The AI could not be reached. Please check your internet connection and try again.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `The AI did not answer (error ${r.status}). Please try again.`);
    // some free models wrap the JSON in "thinking" blocks or code fences
    const txt = String(j.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    let out;
    try { out = JSON.parse(txt.slice(a, b + 1)); } catch (e) { throw new Error('The AI did not return a page design this time. Please press Generate again.'); }
    lastRun = { name: j.name || j.model, ms: j.ms || 0, tokens: j.tokens || 0 };
    return out;
  }
  const callAI = (desc, ind) => chat(systemPrompt(ind), `Page type: ${ind}\nDescription: ${desc}`, 0.7);

  // AI not set up on the server: build from the industry's default order so the flow still works.
  function demoSpec(desc, ind) {
    const title = desc.split(/[.,\n!]/)[0].trim().slice(0, 50) || ind;
    const base = BASE_THEMES[hash(desc) % BASE_THEMES.length];
    return { title, corners: ['square', 'soft', 'round'][rnd(3)], font: base.font, body: base.body, shape: base.shape,
      palettes: distinctThemes([base]),
      sections: ['nav', 'hero', ...INDUSTRIES[ind].order, 'footer'].map(t => ({ type: t, design: 1 + rnd(10), align: t === 'nav' ? 'left' : ['left', 'center'][rnd(2)] })) };
  }

  function makeSection(s, name, ind, fromAI) {
    const idef = INDUSTRIES[ind]?.def?.[s.type] || {};
    const def = merge(DEF[s.type], idef), c = {};
    for (const k in DEF[s.type]) {
      if (s.type === 'table' && (k === 'cols' || k === 'rows')) continue;
      if (Array.isArray(def[k])) {
        const [lo, hi] = ARR_LIMITS[`${s.type}.${k}`] || [def[k].length, def[k].length];
        const given = Array.isArray(s[k]) && (s[k].length || fromAI);
        const arr = given ? s[k].filter(o => o && typeof o === 'object') : def[k];
        const n = clamp(arr.length, lo, hi);
        c[k] = Array.from({ length: n }, (_, j) => { const d = def[k][j % def[k].length], o = {}; for (const kk in d) o[kk] = esc(arr[j]?.[kk] ?? d[kk]); return o; });
      } else c[k] = esc(String(s[k] ?? def[k]).replace('{name}', name));
    }
    if (s.type === 'table') {
      const cols = (Array.isArray(s.cols) && s.cols.length >= 2 ? s.cols : def.cols).slice(0, 5).map(v => esc(String(v ?? '')));
      const rows = Array.isArray(s.rows) && s.rows.length ? s.rows : def.rows;
      c.cols = cols;
      c.rows = rows.slice(0, 12).map(r => cols.map((_, j) => esc(String((Array.isArray(r) ? r[j] : Object.values(r || {})[j]) ?? ''))));
    }
    if (s.type === 'footer') c.copy = esc(DEF.footer.copy.replace('{name}', name)); // always the current year
    if (!FIXED.has(s.type)) c.menuLabel = esc(String(s.menuLabel || idef.menuLabel || TYPEINFO[s.type].label || TYPEINFO[s.type].name).slice(0, 24));
    const qs = Array.isArray(s.imageQueries) ? s.imageQueries : [];
    const pics = PICS[ind] || PICS['Company profile'];
    // different sections start at different photo words, so one page doesn't repeat the same kind of photo
    const pic = j => s.type === 'team' ? 'professional headshot' : pics[(Object.keys(TYPEINFO).indexOf(s.type) + j) % pics.length];
    return {
      type: s.type,
      variant: clamp(parseInt(s.design ?? s.variant) || 1, 1, 10),
      align: ['left', 'center', 'right'].includes(s.align) ? s.align : (s.type === 'nav' ? 'left' : 'center'),
      radius: RADIUS[s.radius] !== undefined ? s.radius : 'soft',
      bg: ['white', 'light', 'colour'].includes(s.background) ? s.background : 'auto',
      menu: typeof s.menu === 'boolean' ? s.menu : MENU_DEFAULT.has(s.type),
      c,
      imgs: Array.from({ length: s.type === 'gallery' ? clamp(qs.length || IMG_COUNT.gallery, 2, 8) : IMG_COUNT[s.type] }, (_, j) => ({ q: String(qs[j] || (s.type === 'team' || s.type === 'gallery' ? pic(j) : s.imageQuery || pic(0))), src: '' }))
    };
  }

  function normalize(spec, desc, ind, fromAI) {
    const name = strip(spec.title || ind).slice(0, 60);
    const allowed = new Set([...INDUSTRIES[ind].types, ...Object.keys(TYPEINFO).filter(t => !FIXED.has(t))]), seen = new Set();
    const secs = (Array.isArray(spec.sections) ? spec.sections : []).filter(s => s && TYPEINFO[s.type] && !seen.has(s.type) && seen.add(s.type));
    const mid = secs.filter(s => !FIXED.has(s.type) && allowed.has(s.type)).slice(0, MAX_CONTENT - 1);
    for (const t of INDUSTRIES[ind].order) if (mid.length < MIN_CONTENT - 1 && !mid.some(m => m.type === t)) mid.push({ type: t });
    const ci = mid.findIndex(m => m.type === 'contact');
    if (ci >= 0) mid.push(...mid.splice(ci, 1)); // contact reads best last, just before the footer
    const corners = RADIUS[spec.corners] !== undefined ? spec.corners : 'soft';
    const pick = t => secs.find(s => s.type === t) || { type: t };
    const sections = [pick('nav'), pick('hero'), ...mid, pick('footer')].map(s => makeSection({ radius: corners, ...s }, name, ind, fromAI));
    // the menu bar and footer show the same phone and email as the contact section
    const contact = sections.find(s => s.type === 'contact');
    if (contact) for (const s of sections.filter(s => s.type === 'nav' || s.type === 'footer')) { s.c.phone = contact.c.phone; s.c.email = contact.c.email; }
    // 3 colour themes; the fonts and button shape are the same for all three
    let pals = (Array.isArray(spec.palettes) ? spec.palettes : Array.isArray(spec.themes) ? spec.themes : []).filter(validTheme).slice(0, 3);
    if (pals.length < 3) pals = distinctThemes(pals.length ? pals : [BASE_THEMES[hash(desc) % BASE_THEMES.length]]);
    const base = BASE_THEMES[hash(desc) % BASE_THEMES.length], first = (spec.palettes || spec.themes || [])[0] || {};
    const look = {
      font: [spec.font, first.font].find(f => HEAD_FONTS.includes(f)) || base.font,
      body: [spec.body, first.body].find(f => BODY_FONTS.includes(f)) || base.body,
      shape: [spec.shape, first.shape].find(f => f in SHAPES) || base.shape
    };
    return { title: name, themes: pals.map((p, k) => fixTheme({ ...p, ...look }, k)), theme: 0, desc, ind, sections };
  }

  // ---------- rendering (the hard-coded design library) ----------
  let state = null;

  const mx = a => a === 'center' ? 'margin-left:auto;margin-right:auto;' : a === 'right' ? 'margin-left:auto;' : '';
  const jc = a => a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start';
  const T = (i, k, v, tag, style) => `<${tag} data-s="${i}" data-k="${k}" style="${style}">${v}</${tag}>`;
  const IMG = (i, n, src, style) => `<img data-s="${i}" data-i="${n}" src="${esc(src)}" alt="" style="display:block;width:100%;object-fit:cover;${style}">`;
  const row = (inner, gap = 32) => `<div style="display:flex;flex-wrap:wrap;gap:${gap}px;align-items:center">${inner}</div>`;
  const col = (inner, basis = 280) => `<div style="flex:1 1 ${basis}px;min-width:0">${inner}</div>`;
  const TH = () => state.themes[state.theme] || state.themes[0];
  const HF = () => `'${TH().font}',Georgia,serif`;
  const BF = () => `'${TH().body}',Arial,sans-serif`;
  const CIRCLE = 'border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;';

  // photographers whose licence asks to be named (CC BY, CC BY-SA); uploads and public-domain photos need no credit
  function photoCredits(color) {
    const seen = new Set(), list = [];
    for (const s of state.sections) for (const m of s.imgs) {
      if (!m.credit || !m.src || m.src.startsWith('data:')) continue;
      const t = `${m.credit.by} (${m.credit.lic})`;
      if (!seen.has(t)) { seen.add(t); list.push(esc(t)); }
    }
    return list.length ? `<div style="font-size:12px;line-height:1.5;color:${color};margin-top:14px;opacity:.85">Photos: ${list.join(' · ')}</div>` : '';
  }

  // links shown in the menu bar and footer: sections marked "menu", at most 5, Contact always kept
  function navLinks() {
    const list = state.sections.map((s, idx) => ({ s, idx })).filter(({ s }) => !FIXED.has(s.type) && s.menu);
    const links = list.slice(0, 5), contact = list.find(x => x.s.type === 'contact');
    if (contact && !links.includes(contact)) links[links.length - 1] = contact;
    return links;
  }

  const WHITE = { h: '#fff', f: '#fff', a: '#fff', tint: 'rgba(255,255,255,.16)', line: 'rgba(255,255,255,.35)' }; // text on photos and colour panels
  const overlay = (src, alpha = .62) => `background:linear-gradient(rgba(10,15,30,${alpha}),rgba(10,15,30,${alpha})),url('${cssUrl(src)}') center/cover;`;

  function ctx(i) {
    const P = TH(), s = state.sections[i], a = s.align;
    const tone = s.bg && s.bg !== 'auto' ? s.bg : (i % 2 ? 'white' : 'light');
    const dark = tone === 'colour';
    const x = {
      s, c: s.c, a, P, dark, tone, L: s.variant - 1,
      bg: dark ? P.primary : tone === 'light' ? P.surface : P.bg,
      fg: dark ? '#fff' : P.text,
      r: RADIUS[s.radius] ?? 10,
      br: SHAPES[P.shape] ?? 8,
      box: `background:#fff;color:${P.text};border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:24px;box-shadow:0 4px 18px rgba(15,23,42,.07);`
    };
    // colours for content sitting on the section background, or inside a white box
    x.k = inBox => inBox || !dark ? { h: P.primary, f: P.text, a: P.accent, tint: P.secondary, line: 'rgba(0,0,0,.12)' } : WHITE;
    // a block in the primary colour (white on a colour section)
    x.panelBg = dark ? '#fff' : P.primary;
    x.onPanel = dark ? x.k(true) : WHITE;
    x.panel = (html, extra = '') => `<div style="background:${x.panelBg};color:${x.onPanel.f};border-radius:20px;padding:44px 34px;${extra}">${html}</div>`;
    x.t = (k, tag, style) => T(i, k, getPath(s.c, k), tag, style);
    x.img = (n, style = '') => { const m = s.imgs[n] ? n : 0; return IMG(i, m, s.imgs[m]?.src || '', `border-radius:${x.r}px;${style}`); };
    x.hd = (kk, size = 32, rule = true, al = a) => x.t('heading', 'h2', `font-family:${HF()};font-size:${size}px;font-weight:700;margin:0 0 12px;line-height:1.25;color:${kk.h}`)
      + (rule ? `<div style="width:56px;height:4px;border-radius:2px;background:${kk.a};margin:0 0 26px;${mx(al)}"></div>` : '');
    x.h2 = () => x.hd(x.k(false));
    // x.dark (not the const above): the hero picks its own dark or light background per design
    x.btn = (k, h, inBox = false, full = false, ghost = false, white = false) => {
      const light = white || (x.dark && !inBox);
      const solid = white || (light && ratio(P.accent, P.primary) < 1.6) ? '#fff' : P.accent; // accent unless it would vanish on the primary colour
      const look = ghost
        ? `background:transparent;color:${light ? '#fff' : P.primary};border:2px solid ${light ? '#fff' : P.primary};`
        : `background:${solid};color:${solid === '#fff' ? P.primary : '#fff'};border:2px solid transparent;box-shadow:0 4px 14px rgba(0,0,0,.12);`;
      return `<a class="qp-btn" data-s="${i}" data-k="${k}" data-h="${h}" href="${esc(hrefFor(s, h))}" style="display:${full ? 'block' : 'inline-block'};text-align:center;${look}font-size:18px;font-weight:700;line-height:1.2;padding:14px 30px;border-radius:${x.br}px;text-decoration:none">${s.c[k]}</a>`;
    };
    return x;
  }
  // where a button goes; "#section" links fall back to a section that exists
  function hrefFor(s, h) {
    let v = strip(s.c[h] || '');
    if (!v && (s.type === 'contact' || s.type === 'nav')) v = telOf(s.c.phone);
    v = safeHref(v);
    if (v.startsWith('#') && v.length > 1 && !state.sections.some(x => x.type === v.slice(1))) {
      const t = state.sections.find(x => x.type === 'contact') || state.sections.find(x => !FIXED.has(x.type));
      v = t && t !== s ? '#' + t.type : '#';
    }
    return v;
  }
  function sec(i, x, inner, extra = '') {
    const line = !x.dark && x.tone === 'white' && i > 1 ? 'border-top:1px solid rgba(0,0,0,.06);' : '';
    return `<section class="qp-sec" data-sec="${i}" id="${x.s.type}" style="background:${x.bg};color:${x.fg};text-align:${x.a};padding:72px 20px;font-family:${BF()};font-size:18px;line-height:1.7;scroll-margin-top:84px;${line}${extra}"><div style="max-width:1040px;margin:0 auto">${inner}</div></section>`;
  }
  const flexWrap = (html, gap = 24, extra = '') => `<div style="display:flex;flex-wrap:wrap;gap:${gap}px;${extra}">${html}</div>`;
  // a row of two parts that becomes one column on phones: a photo side and a content side
  const split = (left, right, extra = '') => `<div style="display:flex;flex-wrap:wrap;border-radius:20px;overflow:hidden;box-shadow:0 14px 34px rgba(15,23,42,.14);text-align:left;${extra}">${left}${right}</div>`;

  const R = {
    nav(i) {
      const x = ctx(i), { s, c, a, P } = x, v = s.variant;
      const dark = v === 3 || v === 8;
      const bg = dark ? P.primary : v === 9 ? P.surface : P.bg, fg = dark ? '#fff' : P.text;
      const logo = c.logoImg
        ? `<img data-logo="1" src="${esc(c.logoImg)}" alt="${esc(strip(c.logo))}" style="height:46px;width:auto;display:block;border-radius:0">`
        : x.t('logo', 'span', `font-family:${HF()};font-size:${v === 10 ? 28 : 24}px;font-weight:800;color:${dark ? '#fff' : P.primary};white-space:nowrap;letter-spacing:-.2px`);
      const brand = `<div style="display:flex;flex-direction:column;align-items:${a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start'}">${logo}${v === 8 && c.tagline ? x.t('tagline', 'div', `font-size:13px;color:${fg};opacity:.8;margin-top:2px`) : ''}</div>`;
      const linkCss = `color:${fg};text-decoration:none;font-weight:600;font-size:${v === 9 ? 14 : 17}px;padding:6px 2px;white-space:nowrap;${v === 9 ? 'text-transform:uppercase;letter-spacing:1.5px;' : ''}${v === 7 ? `border-bottom:3px solid ${P.accent};` : ''}`;
      const linksIn = css => navLinks().map(l => `<a class="qp-link" data-auto="1" href="#${l.s.type}" style="${css}">${T(l.idx, 'menuLabel', l.s.c.menuLabel, 'span', '')}</a>`).join('');
      const links = linksIn(linkCss);
      const withBtn = [2, 5, 8, 10].includes(v);
      const btn = withBtn ? `<a class="qp-btn" data-s="${i}" data-k="cta" data-h="link" href="${esc(hrefFor(s, 'link'))}" style="display:inline-block;background:${dark ? '#fff' : P.accent};color:${dark ? P.primary : '#fff'};font-size:16px;font-weight:700;padding:10px 20px;border-radius:${x.br}px;text-decoration:none;white-space:nowrap">${c.cta}</a>` : '';
      const menu = `<nav class="qp-navlinks" style="display:flex;flex-wrap:wrap;gap:6px 26px;align-items:center;justify-content:${a === 'center' ? 'center' : a === 'right' ? 'flex-start' : 'flex-end'}">${links}${btn}</nav>`;
      const inner = a === 'center'
        ? `<div style="display:flex;flex-direction:column;align-items:center;gap:12px">${brand}<div style="${v === 4 ? `border-top:1px solid ${P.text}22;border-bottom:1px solid ${P.text}22;padding:6px 0;width:100%;` : ''}">${menu}</div></div>`
        : `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 32px;${a === 'right' ? 'flex-direction:row-reverse;' : ''}">${brand}${menu}</div>`;
      const strip5 = v === 5 ? `<div style="background:${P.primary};color:#fff;font-size:15px;padding:7px 20px"><div style="max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;gap:4px 24px;justify-content:${jc(a === 'right' ? 'left' : a)}">${strip(c.phone) ? `<span>📞 ${x.t('phone', 'span', '')}</span>` : ''}${strip(c.email) ? `<span>✉️ ${x.t('email', 'span', '')}</span>` : ''}</div></div>` : '';
      const edge = v === 10 ? `border-bottom:4px solid ${P.accent};` : v === 4 ? '' : `border-bottom:1px solid ${dark ? 'transparent' : 'rgba(0,0,0,.08)'};`;
      const box = v === 6
        ? `<div style="background:${P.surface};padding:14px 16px"><div style="max-width:1080px;margin:0 auto;background:#fff;border-radius:999px;padding:12px 28px;box-shadow:0 6px 24px rgba(15,23,42,.10)">${inner}</div></div>`
        : `<div style="background:${bg};padding:${a === 'center' ? 18 : 16}px 20px;${edge}"><div style="max-width:1080px;margin:0 auto">${inner}</div></div>`;
      if (v === 10) {
        const top = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 24px;${a === 'right' ? 'flex-direction:row-reverse;' : a === 'center' ? 'flex-direction:column;' : ''}">${brand}${btn}</div>`;
        const bar = `<nav class="qp-navlinks" style="display:flex;flex-wrap:wrap;gap:6px 28px;align-items:center;justify-content:${jc(a)}">${linksIn(`color:#fff;text-decoration:none;font-weight:600;font-size:17px;padding:4px 2px;white-space:nowrap`)}</nav>`;
        return `<header class="qp-nav" data-sec="${i}" id="top" style="font-family:${BF()};font-size:17px;line-height:1.4;text-align:left"><div style="background:${P.bg};padding:18px 20px"><div style="max-width:1080px;margin:0 auto">${top}</div></div><div style="background:${P.primary};padding:10px 20px;border-bottom:4px solid ${P.accent}"><div style="max-width:1080px;margin:0 auto">${bar}</div></div></header>`;
      }
      return `<header class="qp-nav" data-sec="${i}" id="top" style="font-family:${BF()};font-size:17px;line-height:1.4;text-align:left">${strip5}${box}</header>`;
    },

    hero(i) {
      const x = ctx(i), { s, c, a, P } = x, img = s.imgs[0].src;
      const text = dark => (strip(c.badge) ? `<div style="margin-bottom:16px">${x.t('badge', 'span', `display:inline-block;background:${dark ? 'rgba(255,255,255,.18)' : P.secondary};color:${dark ? '#fff' : P.primary};font-size:15px;font-weight:700;padding:6px 14px;border-radius:999px`)}</div>` : '')
        + x.t('heading', 'h1', `font-family:${HF()};font-size:46px;line-height:1.12;margin:0 0 16px;font-weight:800;letter-spacing:-.5px;color:${dark ? '#fff' : P.primary}`)
        + x.t('sub', 'p', `font-size:20px;line-height:1.6;margin:0 0 30px;color:${dark ? '#fff' : P.text};opacity:${dark ? .92 : 1}`)
        + `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:${jc(a)}">${x.btn('cta', 'link', !dark)}${strip(c.cta2) ? x.btn('cta2', 'link2', !dark, false, true) : ''}</div>`;
      const im = (st = '') => x.img(0, 'height:380px;box-shadow:0 18px 40px rgba(15,23,42,.18);' + st);
      const narrow = inner => `<div style="max-width:680px;${mx(a)}">${inner}</div>`;
      const photoBg = overlay(img) + 'padding:120px 20px;';
      const H = (bg, fg, inner, extra = '') => sec(i, { ...x, bg, fg, dark: bg === P.primary, tone: 'hero' }, inner, extra);
      x.dark = true; // hero designs pick their own colours; buttons below are told explicitly
      switch (s.variant) {
        case 1: return H(P.primary, '#fff', narrow(text(true)), 'padding:110px 20px;');
        case 2: return H(P.bg, P.text, row(col(text()) + col(im()), 48), 'padding:88px 20px;');
        case 3: return H(P.bg, P.text, row(col(im()) + col(text()), 48), 'padding:88px 20px;');
        case 4: return H(P.primary, '#fff', narrow(text(true)), photoBg);
        case 5: return H(P.primary, '#fff', narrow(text(true)) + `<div style="margin-top:44px">${im('max-width:820px;margin:0 auto;border:5px solid rgba(255,255,255,.9);')}</div>`, 'padding:96px 20px 72px;');
        case 6: return H(P.primary, '#fff', `<div style="${x.box}max-width:560px;${mx(a)}padding:40px">${text()}</div>`, photoBg);
        case 7: return H(P.surface, P.text, `<div style="width:64px;height:5px;border-radius:3px;background:${P.accent};${mx(a)}margin-bottom:24px"></div>` + narrow(text()), 'padding:110px 20px;');
        case 8: return H(P.surface, P.text, x.img(0, `width:190px;height:190px;border-radius:50%;${mx(a)}margin-bottom:26px;border:6px solid #fff;box-shadow:0 10px 30px rgba(15,23,42,.18)`) + narrow(text()), 'padding:88px 20px;');
        case 9: return H(P.bg, P.text, row(col(text()) + col(`<div style="background:${P.secondary};border-radius:${x.r + 8}px;padding:18px;transform:rotate(-1.5deg)">${x.img(0, 'height:360px;transform:rotate(1.5deg)')}</div>`), 48), 'padding:88px 20px;');
        default: return H(P.surface, P.text, narrow(text()) + `<div style="margin-top:44px">${im('height:340px;')}</div>`, 'padding:96px 20px 72px;');
      }
    },

    about(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const text = (kk = k) => x.t('text', 'p', `font-size:19px;line-height:1.75;margin:0 0 26px;color:${kk.f}`);
      const stats = (kk = k) => c.stats.length ? `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:${jc(a)}">` + c.stats.map((st, j) =>
        `<div style="border-left:4px solid ${kk.a};padding:2px 16px;min-width:120px;text-align:left">${x.t(`stats.${j}.num`, 'div', `font-family:${HF()};font-size:26px;font-weight:800;color:${kk.h};line-height:1.3`)}${x.t(`stats.${j}.label`, 'div', `font-size:16px;color:${kk.f}`)}</div>`).join('') + '</div>' : '';
      const body = (kk = k, al = a) => x.hd(kk, 32, true, al) + text(kk) + stats(kk);
      const im = (h = 380, st = '') => x.img(0, `height:${h}px;box-shadow:0 14px 34px rgba(15,23,42,.14);${st}`);
      const inner = [
        row(col(im()) + col(body()), 48),
        row(col(body()) + col(im()), 48),
        `<div style="max-width:720px;${mx(a)}">${body()}</div>`,
        im(300) + `<div style="margin-top:34px">${body()}</div>`,
        `<div style="border-${a === 'right' ? 'right' : 'left'}:6px solid ${k.a};padding:${a === 'right' ? '4px 28px 4px 0' : '4px 0 4px 28px'};max-width:780px;${mx(a)}">`
          + x.t('heading', 'div', `font-size:15px;letter-spacing:2px;text-transform:uppercase;color:${k.h};font-weight:700;margin-bottom:14px`)
          + x.t('text', 'p', `font-family:${HF()};font-size:26px;font-style:italic;line-height:1.5;margin:0 0 26px;color:${k.f}`) + stats() + '</div>',
        // 6 photo and text joined in one card
        `<div style="${x.box}padding:0;overflow:hidden;display:flex;flex-wrap:wrap;text-align:left"><div style="flex:1 1 320px;min-height:320px">${x.img(0, 'height:100%;min-height:320px;border-radius:0;')}</div><div style="flex:1 1 340px;padding:40px 36px">${body(kc, 'left')}</div></div>`,
        // 7 wide photo with a card overlapping it
        im(420, 'box-shadow:none;') + `<div style="position:relative;margin:-110px auto 0;max-width:680px;${x.box}padding:36px;text-align:${a}">${body(kc)}</div>`,
        // 8 key facts in big cards, text below
        (c.stats.length ? flexWrap(c.stats.map((st, j) => `<div style="${x.box}flex:1 1 180px;text-align:center;padding:26px 18px">${x.t(`stats.${j}.num`, 'div', `font-family:${HF()};font-size:36px;font-weight:800;color:${P.accent};line-height:1.2`)}${x.t(`stats.${j}.label`, 'div', `font-size:16px;color:${P.text};margin-top:6px`)}</div>`).join(''), 20, 'margin-bottom:40px') : '')
          + `<div style="max-width:720px;${mx(a)}">${x.hd(k)}${text()}</div>`,
        // 9 big title on the left, text with a line on the right
        row(col(x.t('heading', 'h2', `font-family:${HF()};font-size:42px;font-weight:800;line-height:1.15;margin:0;color:${k.h}`), 260)
          + col(`<div style="border-left:4px solid ${k.a};padding-left:28px;text-align:left">${text()}${stats()}</div>`, 380), 40),
        // 10 round photo beside the text
        row(`<div style="flex:0 0 auto;${mx(a)}">${x.img(0, `width:260px;height:260px;border-radius:50%;border:8px solid ${k.tint};box-shadow:0 12px 30px rgba(15,23,42,.16)`)}</div>` + col(body(), 320), 48)
      ][L];
      return sec(i, x, inner);
    },

    features(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const icon = (j, kk = k, size = 64, extra = '') => x.t(`items.${j}.icon`, 'div', `width:${size}px;height:${size}px;${CIRCLE}background:${kk.tint};font-size:${Math.round(size * .47)}px;border-radius:${Math.round(size * .28)}px;${extra}`);
      const num = j => `<div style="width:52px;height:52px;${CIRCLE}background:${x.dark ? '#fff' : P.primary};color:${x.dark ? P.primary : '#fff'};font-weight:800;font-size:20px">${j + 1}</div>`;
      const check = `<div style="width:36px;height:36px;${CIRCLE}background:${P.accent};color:#fff;font-weight:800;font-size:18px">✓</div>`;
      const title = (j, kk = k, m = '0 0 6px') => x.t(`items.${j}.title`, 'h3', `font-family:${HF()};font-size:21px;font-weight:700;margin:${m};color:${kk.h}`);
      const text = (j, kk = k) => x.t(`items.${j}.text`, 'p', `font-size:17px;margin:0;line-height:1.65;color:${kk.f}`);
      const each = fn => c.items.map((_, j) => fn(j)).join('');
      const stack = (j, kk = k, wrap = '') => `<div style="${wrap}flex:1 1 240px;text-align:${a}">${icon(j, kk, 64, mx(a) + 'margin-bottom:16px;')}${title(j, kk)}${text(j, kk)}</div>`;
      const inline = (j, lead, kk = k) => `<div style="display:flex;gap:18px;align-items:flex-start;text-align:left;margin-bottom:24px">${lead}<div>${title(j, kk)}${text(j, kk)}</div></div>`;
      const list = each(j => inline(j, icon(j)));
      const inner = [
        flexWrap(each(j => stack(j)), 28),
        `<div style="max-width:680px;${mx(a)}">${list}</div>`,
        row(col(x.img(0, 'height:380px;')) + col(list), 48),
        row(col(list) + col(x.img(0, 'height:380px;')), 48),
        `<div style="max-width:720px;${mx(a)}">${each(j => inline(j, num(j)))}</div>`,
        // 6 white cards with a colour line on top
        flexWrap(each(j => `<div style="${x.box}border-top:5px solid ${P.accent};flex:1 1 260px;text-align:left"><div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">${icon(j, kc, 48)}${title(j, kc, '0')}</div>${text(j, kc)}</div>`), 22),
        // 7 two-column checklist
        flexWrap(each(j => `<div style="flex:1 1 320px">${inline(j, check)}</div>`), 6, 'column-gap:40px'),
        // 8 everything on a colour block
        x.panel(flexWrap(each(j => stack(j, x.onPanel)), 28)),
        // 9 wide photo, cards below
        x.img(0, 'height:320px;') + `<div style="margin-top:28px">${flexWrap(each(j => `<div style="${x.box}flex:1 1 230px;text-align:${a}">${icon(j, kc, 56, mx(a) + 'margin-bottom:12px;')}${title(j, kc)}${text(j, kc)}</div>`), 20)}</div>`,
        // 10 rows with a big icon, alternating sides
        each(j => `<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;margin-bottom:28px;text-align:left;${j % 2 ? 'flex-direction:row-reverse;' : ''}">${icon(j, k, 110)}<div style="flex:1 1 300px">${title(j)}${text(j)}</div></div>`)
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    steps(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true), n = c.items.length;
      const num = (j, size = 48) => `<div style="width:${size}px;height:${size}px;${CIRCLE}background:${x.dark ? '#fff' : P.primary};color:${x.dark ? P.primary : '#fff'};font-weight:800;font-size:${Math.round(size * .42)}px">${j + 1}</div>`;
      const title = (j, kk = k) => x.t(`items.${j}.title`, 'h3', `font-family:${HF()};font-size:21px;font-weight:700;margin:0 0 4px;color:${kk.h}`);
      const text = (j, kk = k) => x.t(`items.${j}.text`, 'p', `font-size:17px;margin:0;line-height:1.65;color:${kk.f}`);
      const each = fn => c.items.map((_, j) => fn(j)).join('');
      const list = each(j => `<div style="display:flex;gap:18px;align-items:flex-start;text-align:left;margin-bottom:26px">${num(j)}<div>${title(j)}${text(j)}</div></div>`);
      const inner = [
        `<div style="max-width:720px;${mx(a)}">${list}</div>`,
        flexWrap(each(j => `<div style="flex:1 1 220px;text-align:${a}"><div style="font-family:${HF()};font-size:44px;font-weight:800;color:${k.a};line-height:1;margin-bottom:6px">${j + 1}</div>${title(j)}${text(j)}</div>`), 28),
        `<div style="max-width:720px;${mx(a)};text-align:left;border-left:3px solid ${k.line};margin-left:${a === 'left' ? '24px' : 'auto'}">${each(j => `<div style="position:relative;padding:0 0 28px 42px"><div style="position:absolute;left:-22px;top:0">${num(j, 42)}</div>${title(j)}${text(j)}</div>`)}</div>`,
        row(col(x.img(0, 'height:400px;')) + col(list), 48),
        flexWrap(each(j => `<div style="flex:1 1 220px;text-align:${a};border-top:4px solid ${k.a};padding-top:18px"><div style="font-family:${HF()};font-size:52px;font-weight:800;color:${k.h};line-height:1;margin-bottom:10px">${String(j + 1).padStart(2, '0')}</div>${title(j)}${text(j)}</div>`), 28),
        // 6 steps in a row with arrows between
        flexWrap(each(j => `<div style="flex:1 1 170px;max-width:260px;text-align:center"><div style="display:flex;justify-content:center;margin-bottom:12px">${num(j, 58)}</div>${title(j)}${text(j)}</div>${j < n - 1 ? `<div style="flex:0 0 auto;font-size:32px;line-height:58px;color:${k.a}" aria-hidden="true">→</div>` : ''}`), 12, 'justify-content:center;align-items:flex-start'),
        // 7 white step cards with a big number label
        flexWrap(each(j => `<div style="${x.box}flex:1 1 230px;text-align:${a}"><div style="font-family:${HF()};font-size:15px;font-weight:800;letter-spacing:3px;color:${P.accent};margin-bottom:8px">${String(j + 1).padStart(2, '0')}</div>${title(j, kc)}${text(j, kc)}</div>`), 22),
        // 8 zigzag cards
        `<div style="max-width:880px;margin:0 auto">${each(j => `<div style="${x.box}max-width:540px;${j % 2 ? 'margin-left:auto;' : ''}display:flex;gap:18px;align-items:flex-start;text-align:left;margin-bottom:20px">${num(j)}<div>${title(j, kc)}${text(j, kc)}</div></div>`)}</div>`,
        // 9 big numbers on a colour block
        x.panel(flexWrap(each(j => `<div style="flex:1 1 200px;text-align:${a}"><div style="font-family:${HF()};font-size:58px;font-weight:800;line-height:1;color:${x.onPanel.a};opacity:.9;margin-bottom:8px">${j + 1}</div>${title(j, x.onPanel)}${text(j, x.onPanel)}</div>`), 28)),
        // 10 wide photo, steps in two columns below
        x.img(0, 'height:300px;') + flexWrap(each(j => `<div style="flex:1 1 320px;display:flex;gap:16px;align-items:flex-start;text-align:left;margin-bottom:22px">${num(j, 42)}<div>${title(j)}${text(j)}</div></div>`), 0, 'column-gap:40px;margin-top:32px')
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    table(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const { cols, rows } = c;
      const cell = (r, j) => x.t(`rows.${r}.${j}`, 'span', '');
      // "Yes"/"No" cells get a tick or a cross in the comparison design
      const mark = (r, j) => { const v = strip(rows[r][j]).toLowerCase(); return /^(yes|✓|included)$/.test(v) ? `<span style="color:${k.a};font-weight:800;margin-right:6px">✓</span>` : /^(no|—|-)$/.test(v) ? `<span style="color:${k.f};opacity:.5;font-weight:800;margin-right:6px">✕</span>` : ''; }; // neutral colours: "yes" is not always good (e.g. allergens)
      const table = (th, td, ticks = false, wrap = '') => `<div style="overflow-x:auto;${wrap}"><table style="width:100%;border-collapse:collapse;text-align:left;min-width:${cols.length * 120}px">`
        + `<thead><tr>${cols.map((_, j) => `<th style="border:0;padding:14px 18px;font-weight:700;font-size:16px;white-space:nowrap;${th(j)}">${x.t(`cols.${j}`, 'span', '')}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map((_, r) => `<tr>${cols.map((_, j) => `<td style="border:0;padding:14px 18px;font-size:17px;vertical-align:top;${td(r, j)}">${ticks && j ? mark(r, j) : ''}${cell(r, j)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      const line = `border-bottom:1px solid ${k.line};`;
      const intro = (kk = k) => strip(c.intro) ? x.t('intro', 'p', `font-size:18px;margin:0 0 22px;color:${kk.f}`) : '';
      const note = (kk = k) => strip(c.note) ? x.t('note', 'p', `font-size:16px;margin:16px 0 0;color:${kk.f};font-style:italic`) : '';
      const plain = j => esc(strip(cols[j])); // repeated column names are plain text, so each name is edited in one place
      const inner = [
        table(() => `color:${k.h};border-bottom:3px solid ${k.a};`, () => `${line}color:${k.f};`),
        table(() => `color:${k.h};border-bottom:3px solid ${k.a};`, r => `${line}color:${k.f};${r % 2 === 0 ? `background:${k.tint};` : ''}`),
        table(() => `background:${x.dark ? P.accent : P.primary};color:#fff;`, () => `${line}color:${k.f};`, false, `border-radius:${Math.min(x.r, 14)}px;`),
        table(() => `color:${k.h};border:1px solid ${k.line};`, () => `border:1px solid ${k.line};color:${k.f};`),
        table(() => `color:${k.h};border-bottom:3px solid ${k.a};`, (r, j) => `${line}${j === 0 ? `background:${k.tint};font-weight:700;color:${k.h};` : `color:${k.f};`}`),
        // 6 soft card with a tinted header
        `<div style="${x.box}padding:8px">${table(() => `background:${P.secondary};color:${P.primary};`, () => `border-bottom:1px solid rgba(0,0,0,.06);color:${P.text};`, false, 'border-radius:10px;')}</div>`,
        // 7 one card per row
        flexWrap(rows.map((_, r) => `<div style="${x.box}flex:1 1 260px;text-align:left">${x.t(`rows.${r}.0`, 'div', `font-family:${HF()};font-size:20px;font-weight:700;color:${P.primary};margin-bottom:10px`)}${cols.slice(1).map((_, j) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid rgba(0,0,0,.06)"><span style="color:#666;font-size:15px">${plain(j + 1)}</span><span style="font-weight:600;color:${P.text};text-align:right">${cell(r, j + 1)}</span></div>`).join('')}</div>`).join(''), 18),
        // 8 comparison with ticks
        table(j => `color:${k.h};border-bottom:3px solid ${k.a};${j ? 'text-align:center;' : ''}`, (r, j) => `${line}color:${j ? k.f : k.h};${j ? 'text-align:center;' : 'font-weight:700;'}`, true),
        // 9 simple list, one line per row
        `<div style="font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:${k.a};font-weight:700;margin-bottom:6px;text-align:left">${cols.map((_, j) => x.t(`cols.${j}`, 'span', '')).join(' · ')}</div>`
          + rows.map((_, r) => `<div style="${line}padding:14px 0;text-align:left;color:${k.f}">${x.t(`rows.${r}.0`, 'span', `font-weight:700;color:${k.h}`)}${cols.length > 1 ? ' — ' : ''}${cols.slice(1).map((_, j) => cell(r, j + 1)).join(' · ')}</div>`).join(''),
        // 10 shaded columns
        table(j => `color:${k.h};border-bottom:3px solid ${k.a};${j % 2 ? `background:${k.tint};` : ''}`, (r, j) => `${line}color:${k.f};${j % 2 ? `background:${k.tint};` : ''}`)
      ][L];
      return sec(i, x, `<div style="max-width:920px;${mx(a)}">${x.h2()}${intro()}${inner}${note()}</div>`);
    },

    gallery(i) {
      const x = ctx(i), { s, a, L } = x, k = x.k(false), n = s.imgs.length;
      const all = s.imgs.map((_, j) => j), rest = all.slice(1);
      const g = (j, h, wrap = '', st = '') => `<div style="${wrap}">${x.img(j, `height:${h}px;${st}`)}</div>`;
      const grid = (list, h, basis, gap = 16) => flexWrap(list.map(j => g(j, h, `flex:1 1 ${basis};min-width:140px`)).join(''), gap);
      const pairs = list => list.reduce((acc, j, m) => (m % 2 ? acc[acc.length - 1].push(j) : acc.push([j]), acc), []);
      if (L === 9) { // big title beside a grid
        return sec(i, x, row(col(x.t('heading', 'h2', `font-family:${HF()};font-size:42px;font-weight:800;line-height:1.15;margin:0;color:${k.h}`) + `<div style="width:56px;height:4px;border-radius:2px;background:${k.a};margin-top:18px;${mx(a)}"></div>`, 240)
          + col(grid(all, 180, '40%', 14), 420), 40));
      }
      const wide = n > 1 && n % 3 === 1 ? n - 1 : -1; // in rows of three, a last photo on its own spans the row
      const inner = [
        grid(all, 240, '40%'),
        grid(all, 210, '20%'),
        n > 1 ? row(col(g(0, 376), 300) + col(grid(rest, rest.length > 2 ? 180 : 376 / rest.length - 8, '40%', 14), 260), 16) : g(0, 376),
        flexWrap(all.map(j => j === wide ? g(j, 280, 'flex:1 1 100%') : g(j, 210, 'flex:1 1 28%;min-width:150px')).join(''), 16),
        `<div style="display:flex;gap:16px;overflow-x:auto;padding-bottom:8px">${all.map(j => g(j, 250, 'flex:none;width:290px')).join('')}</div>`,
        // 6 mosaic: one tall photo, then pairs stacked in columns
        flexWrap(g(0, 400, 'flex:2 1 300px') + pairs(rest).map(p => p.length === 2
          ? `<div style="flex:1 1 200px;display:flex;flex-direction:column;gap:16px">${g(p[0], 192)}${g(p[1], 192)}</div>` : g(p[0], 400, 'flex:1 1 200px')).join(''), 16),
        // 7 photo prints with white borders
        flexWrap(all.map(j => `<div style="flex:0 1 230px;background:#fff;padding:12px 12px 40px;box-shadow:0 8px 24px rgba(15,23,42,.18);transform:rotate(${[-2, 1.5, -1, 2][j % 4]}deg)">${x.img(j, 'height:200px;border-radius:2px;')}</div>`).join(''), 26, 'justify-content:center;padding:10px 0'),
        // 8 round photos
        flexWrap(all.map(j => x.img(j, `width:200px;height:200px;border-radius:50%;flex:none;border:6px solid ${k.tint};`)).join(''), 24, `justify-content:${jc(a)}`),
        // 9 one big photo with the others small below
        g(0, 420) + (rest.length ? flexWrap(rest.map(j => g(j, 150, 'flex:1 1 22%;min-width:120px')).join(''), 16, 'margin-top:16px') : '')
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    offer(i) {
      const x = ctx(i), { s, a, L, P } = x, k = x.k(false);
      const code = (st = '') => x.t('code', 'span', `display:inline-block;font-family:'Courier New',monospace;letter-spacing:4px;font-size:28px;font-weight:700;padding:10px 24px;border:2px dashed ${P.accent};border-radius:8px;background:#fff;color:${P.accent};${st}`);
      const offer = (size = 50, color = k.a) => x.t('offer', 'div', `font-family:${HF()};font-size:${size}px;font-weight:800;color:${color};line-height:1.1;margin:8px 0`);
      const small = (color = k.f) => x.t('terms', 'p', `font-size:17px;margin:16px 0 4px;color:${color}`) + x.t('expiry', 'p', `font-size:16px;margin:0;color:${color};font-weight:600`);
      const head = (color = k.h) => x.t('heading', 'h2', `font-family:${HF()};font-size:28px;font-weight:700;margin:0;color:${color}`);
      const label = color => `<div style="font-size:15px;letter-spacing:2px;text-transform:uppercase;margin:18px 0 8px;color:${color}">Your code</div>`;
      const band = x.dark ? P.accent : P.primary;
      const narrow = (html, w = 560) => `<div style="max-width:${w}px;${mx(a)}">${html}</div>`;
      const inner = [
        `<div style="border:3px dashed ${P.accent};border-radius:16px;padding:36px 26px;max-width:560px;${mx(a)}background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.08)">${head(P.primary)}${offer(50, P.accent)}${label(P.text)}${code()}${small(P.text)}</div>`,
        narrow(head() + offer(72) + label(k.f) + code(`background:${P.primary};color:#fff;border-color:${x.dark ? '#fff' : P.primary};font-size:34px`) + small(), 680),
        row(col(x.img(0, 'height:320px;')) + col(head() + offer() + label(k.f) + code() + small()), 40),
        `<div style="background:${band};color:#fff;border-radius:16px;padding:32px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between;text-align:left"><div>${head('#fff')}${offer(46, '#fff')}</div><div>${code()}${small('#fff')}</div></div>`,
        `<div style="width:190px;height:190px;${CIRCLE}background:${P.accent};${mx(a)}margin-bottom:22px;padding:12px;text-align:center;box-shadow:0 0 0 8px ${k.tint}">${offer(34, '#fff')}</div>` + head() + label(k.f) + code() + small(),
        // 6 gift card
        `<div style="max-width:500px;${mx(a)}background:${band};color:#fff;border-radius:22px;padding:42px 34px;position:relative;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,.25)"><div style="position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.12)"></div><div style="position:absolute;left:-30px;bottom:-50px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.08)"></div><div style="position:relative">${head('#fff')}${offer(62, '#fff')}${label('rgba(255,255,255,.85)')}${code('border-color:#fff')}${small('#fff')}</div></div>`,
        // 7 cut-out coupon in two parts
        `<div style="max-width:740px;${mx(a)}background:#fff;border:3px dashed ${P.accent};border-radius:14px;display:flex;flex-wrap:wrap;position:relative;text-align:left"><div style="position:absolute;top:-17px;left:26px;background:${x.bg};padding:0 8px;font-size:22px;line-height:1.4;color:${P.accent}" aria-hidden="true">✂</div><div style="flex:1 1 260px;padding:30px;border-right:3px dashed ${P.accent}">${head(P.primary)}${offer(58, P.accent)}</div><div style="flex:1 1 230px;padding:30px">${label(P.text)}${code()}${small(P.text)}</div></div>`,
        // 8 on a photo
        `<div style="border-radius:20px;padding:70px 30px;${overlay(s.imgs[0].src)}color:#fff">${narrow(head('#fff') + offer(66, '#fff') + label('#fff') + code() + small('#fff'), 620)}</div>`,
        // 9 very big offer, simple code
        narrow(head() + offer(110) + `<div style="margin-top:10px">${x.t('code', 'span', `font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:5px;color:${k.h};border-bottom:4px solid ${k.a};padding-bottom:4px`)}</div>` + small(), 760),
        // 10 card with a corner ribbon
        `<div style="${x.box}max-width:600px;${mx(a)}position:relative;overflow:hidden;padding:46px 34px 34px"><div style="position:absolute;top:24px;right:-48px;transform:rotate(45deg);background:${P.accent};color:#fff;font-weight:800;font-size:18px;padding:6px 60px" aria-hidden="true">%</div>${head(P.primary)}${offer(56, P.accent)}${label(P.text)}${code()}${small(P.text)}</div>`
      ][L];
      return sec(i, x, inner);
    },

    prices(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true), n = c.items.length;
      const name = (j, kk = k, st = '') => x.t(`items.${j}.name`, 'span', `font-weight:700;color:${kk.h};${st}`);
      const price = (j, kk = k, size = 18, st = '') => x.t(`items.${j}.price`, 'span', `font-weight:800;font-size:${size}px;color:${kk.h};white-space:nowrap;${st}`);
      const desc = (j, kk = k) => strip(c.items[j].desc) ? x.t(`items.${j}.desc`, 'div', `font-size:16px;color:${kk.f};opacity:.85`) : '';
      const leader = (j, kk = k) => `<div style="margin-bottom:18px;text-align:left"><div style="display:flex;align-items:baseline;gap:8px">${name(j, kk)}<span style="flex:1;border-bottom:2px dotted ${kk.line};transform:translateY(-4px)"></span>${price(j, kk)}</div>${desc(j, kk)}</div>`;
      const each = fn => c.items.map((_, j) => fn(j)).join('');
      const note = (kk = k) => strip(c.note) ? x.t('note', 'p', `font-size:16px;margin:14px 0 0;color:${kk.f};font-style:italic`) : '';
      const narrow = html => `<div style="max-width:680px;${mx(a)}">${html}</div>`;
      const board = x.dark ? kc : { ...WHITE, f: 'rgba(255,255,255,.9)', line: 'rgba(255,255,255,.35)' };
      const mid = Math.floor((n - 1) / 2);
      const inner = [
        narrow(each(j => leader(j)) + note()),
        narrow(`<table style="width:100%;border-collapse:collapse;text-align:left">${each(j => `<tr><td style="padding:14px 8px;border:0;border-bottom:1px solid ${k.line}">${name(j)}${desc(j)}</td><td style="padding:14px 8px;border:0;border-bottom:1px solid ${k.line};text-align:right;vertical-align:top">${price(j)}</td></tr>`)}</table>` + note()),
        flexWrap(each(j => `<div style="flex:1 1 300px">${leader(j)}</div>`), 0, 'column-gap:44px') + note(),
        flexWrap(each(j => `<div style="${x.box}flex:1 1 220px;text-align:${a}"><div style="font-weight:700;font-size:19px;color:${P.primary}">${x.t(`items.${j}.name`, 'span', '')}</div>${desc(j, kc)}<div style="margin-top:10px">${price(j, kc, 32, `font-family:${HF()};color:${P.accent}`)}</div></div>`), 20) + note(),
        row(col(x.img(0, 'height:400px;')) + col(each(j => leader(j)) + note()), 48),
        // 6 dark menu board
        `<div style="max-width:720px;${mx(a)}background:${x.dark ? '#fff' : shade(P.primary, .25)};border-radius:16px;padding:40px 36px;box-shadow:inset 0 0 0 6px ${x.dark ? P.secondary : 'rgba(255,255,255,.08)'}">${each(j => leader(j, board))}${note(board)}</div>`,
        // 7 price tags
        narrow(each(j => `<div style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid ${k.line};text-align:left"><div style="flex:1">${name(j, k, 'font-size:19px')}${desc(j)}</div>${x.t(`items.${j}.price`, 'span', `background:${P.accent};color:#fff;font-weight:800;font-size:18px;padding:8px 18px;border-radius:999px;white-space:nowrap`)}</div>`) + note()),
        // 8 plans with the middle one highlighted
        flexWrap(each(j => { const hi = n > 1 && j === mid, kk = hi ? { ...WHITE, f: 'rgba(255,255,255,.92)' } : kc;
          return `<div style="${x.box}${hi ? `background:${P.primary};border-color:${P.primary};box-shadow:0 18px 40px rgba(15,23,42,.25);transform:translateY(-8px);` : ''}flex:1 1 220px;text-align:center;padding:34px 24px">${name(j, kk, 'font-size:21px;display:block')}${desc(j, kk)}<div style="margin-top:16px">${price(j, kk, 38, `font-family:${HF()};color:${hi ? '#fff' : P.accent}`)}</div></div>`; }), 20, 'align-items:stretch;padding-top:10px') + note(),
        // 9 price first, then the name
        narrow(each(j => `<div style="display:flex;gap:22px;align-items:baseline;padding:16px 0;border-bottom:1px solid ${k.line};text-align:left">${price(j, k, 26, `min-width:110px;font-family:${HF()};color:${k.a}`)}<div>${name(j, k, 'font-size:19px')}${desc(j)}</div></div>`) + note()),
        // 10 soft tiles
        flexWrap(each(j => `<div style="flex:1 1 300px;background:${k.tint};border-radius:14px;padding:20px 22px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;text-align:left"><div>${name(j, k, 'font-size:19px')}${desc(j)}</div>${price(j, k, 22)}</div>`), 16) + note()
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    product(i) {
      const x = ctx(i), { s, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const head = (kk = k, size = 34) => x.t('heading', 'h2', `font-family:${HF()};font-size:${size}px;font-weight:800;margin:0 0 4px;line-height:1.2;color:${kk.h}`);
      const sub = (kk = k) => x.t('sub', 'p', `margin:0 0 8px;font-size:18px;color:${kk.a};font-weight:600`);
      const price = (kk = k, size = 36, m = '6px 0 16px') => x.t('price', 'div', `font-family:${HF()};font-size:${size}px;font-weight:800;color:${kk.h};margin:${m}`);
      const text = (kk = k) => x.t('text', 'p', `font-size:18px;margin:0 0 24px;color:${kk.f}`);
      const details = (kk = k, inBox = false, full = false) => head(kk) + sub(kk) + price(kk) + text(kk) + x.btn('cta', 'link', inBox, full);
      const narrow = html => `<div style="max-width:580px;${mx(a)}margin-top:28px">${html}</div>`;
      const inner = [
        x.img(0, 'max-height:480px;') + narrow(details(k, false, true)),
        row(col(x.img(0, 'height:420px;')) + col(details()), 48),
        row(col(details()) + col(x.img(0, 'height:420px;')), 48),
        `<div style="background:${k.tint};padding:18px;border-radius:${x.r + 6}px;max-width:640px;${mx(a)}">${x.img(0, 'height:380px;')}</div>` + narrow(details()),
        `<div style="position:relative">${x.img(0, 'height:440px;')}<div style="position:absolute;right:18px;bottom:18px;background:${P.accent};color:#fff;border-radius:10px;padding:8px 20px;box-shadow:0 8px 20px rgba(0,0,0,.25)">${x.t('price', 'div', `font-family:${HF()};font-size:30px;font-weight:800`)}</div></div>` + narrow(head() + sub() + text() + x.btn('cta', 'link')),
        // 6 white card on the photo
        `<div style="border-radius:20px;padding:80px 24px;${overlay(s.imgs[0].src, .4)}"><div style="${x.box}max-width:520px;${mx(a)}padding:36px">${details(kc, true)}</div></div>`,
        // 7 photo, then text beside a price box
        x.img(0, 'height:360px;') + `<div style="display:flex;flex-wrap:wrap;gap:28px;margin-top:30px;align-items:center;text-align:left"><div style="flex:2 1 320px">${head()}${sub()}${text()}</div><div style="flex:1 1 240px;background:${k.tint};border-radius:16px;padding:28px;text-align:center">${price(k, 44)}${x.btn('cta', 'link', false, true)}</div></div>`,
        // 8 big round photo
        `<div style="text-align:center">${x.img(0, `width:300px;height:300px;border-radius:50%;margin:0 auto 28px;border:10px solid ${k.tint};box-shadow:0 16px 36px rgba(15,23,42,.18)`)}<div style="max-width:560px;margin:0 auto">${details()}</div></div>`,
        // 9 photo beside a colour panel
        split(`<div style="flex:1 1 320px;min-height:340px">${x.img(0, 'height:100%;min-height:340px;border-radius:0;')}</div>`, `<div style="flex:1 1 320px;background:${x.panelBg};padding:44px 36px">${details(x.onPanel, x.dark)}</div>`),
        // 10 compact card with a small photo
        `<div style="${x.box}max-width:620px;${mx(a)}text-align:left"><div style="display:flex;gap:18px;align-items:center;margin-bottom:14px">${x.img(0, 'width:120px;height:120px;flex:none;')}<div>${head(kc, 26)}${sub(kc)}</div></div>${text(kc)}<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">${price(kc, 32, '0')}${x.btn('cta', 'link', true)}</div></div>`
      ][L];
      return sec(i, x, inner);
    },

    stats(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false);
      const num = (j, color = k.h, size = 46) => x.t(`items.${j}.num`, 'div', `font-family:${HF()};font-size:${size}px;font-weight:800;color:${color};line-height:1.1`);
      const lab = (j, color = k.f, m = '6px 0 0') => x.t(`items.${j}.label`, 'div', `font-size:17px;color:${color};margin:${m}`);
      const head = strip(c.heading) ? x.h2() : '';
      const cells = (fn, gap = 24) => flexWrap(c.items.map((_, j) => fn(j)).join(''), gap, `justify-content:${jc(a)}`);
      const inner = [
        head + cells(j => `<div style="flex:1 1 180px;text-align:${a};border-left:${j ? `1px solid ${k.line}` : '0'};padding:0 18px">${num(j)}${lab(j)}</div>`),
        head + cells(j => `<div style="flex:1 1 180px;text-align:center"><div style="width:150px;height:150px;${CIRCLE}margin:0 auto 10px;border:5px solid ${x.dark ? '#fff' : P.accent};background:${x.dark ? 'transparent' : '#fff'}">${num(j, x.dark ? '#fff' : P.primary, 34)}</div>${lab(j)}</div>`),
        head + x.panel(cells(j => `<div style="flex:1 1 180px;text-align:center">${num(j, x.onPanel.h)}${lab(j, x.onPanel.f)}</div>`), 'padding:40px 28px;'),
        head + cells(j => `<div style="flex:1 1 180px;text-align:${a}">${num(j)}<div style="width:44px;height:4px;background:${k.a};margin:10px 0 0;${mx(a)}"></div>${lab(j)}</div>`),
        row(col(head || x.t('heading', 'h2', `font-family:${HF()};font-size:32px;font-weight:700;margin:0;color:${k.h}`), 260) + col(flexWrap(c.items.map((_, j) => `<div style="flex:1 1 140px">${num(j)}${lab(j)}</div>`).join(''), 24), 360), 40),
        // 6 white cards with a colour edge
        head + cells(j => `<div style="${x.box}flex:1 1 200px;text-align:left;border-left:6px solid ${P.accent}">${num(j, P.primary, 40)}${lab(j, P.text)}</div>`, 20),
        // 7 stacked list
        head + `<div style="max-width:640px;${mx(a)}">${c.items.map((_, j) => `<div style="display:flex;align-items:baseline;gap:22px;padding:16px 0;border-bottom:1px solid ${k.line};text-align:left"><div style="min-width:160px">${num(j, k.a, 40)}</div>${lab(j, k.f, '0')}</div>`).join('')}</div>`,
        // 8 soft tiles
        head + cells(j => `<div style="flex:1 1 180px;background:${k.tint};border-radius:18px;padding:30px 20px;text-align:center">${num(j)}${lab(j)}</div>`, 18),
        // 9 accent band
        head + `<div style="background:${P.accent};border-radius:18px;padding:40px 28px">${cells(j => `<div style="flex:1 1 180px;text-align:center">${num(j, '#fff')}${lab(j, '#fff')}</div>`)}</div>`,
        // 10 outlined boxes
        head + cells(j => `<div style="flex:1 1 180px;border:2px solid ${k.h};border-radius:14px;padding:26px 18px;text-align:center">${num(j, k.h, 40)}${lab(j)}</div>`, 18)
      ][L];
      return sec(i, x, inner);
    },

    reviews(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false);
      const stars = dark => `<div style="color:${dark ? '#ffd56b' : '#b8860b'};font-size:20px;letter-spacing:3px" aria-label="5 stars">★★★★★</div>`;
      const quote = (j, size = 18, color = k.f, m = '10px 0 12px') => x.t(`items.${j}.quote`, 'p', `font-family:${HF()};font-style:italic;font-size:${size}px;line-height:1.6;margin:${m};color:${color}`);
      const who = (j, color = k.h, dash = true) => `<div style="font-weight:700;color:${color}">${dash ? '— ' : ''}${x.t(`items.${j}.name`, 'span', '')}</div>`;
      const initial = j => esc((strip(c.items[j].name)[0] || '?').toUpperCase());
      const each = fn => c.items.map((_, j) => fn(j)).join('');
      const narrow = html => `<div style="max-width:760px;${mx(a)}">${html}</div>`;
      const inner = [
        flexWrap(each(j => `<div style="${x.box}flex:1 1 250px;text-align:${a}">${stars(false)}${quote(j, 18, P.text)}${who(j, P.primary)}</div>`), 22),
        narrow(`${stars(x.dark)}${quote(0, 28)}${who(0)}`) + (c.items.length > 1 ? flexWrap(c.items.slice(1).map((_, j) => `<div style="flex:1 1 260px">${quote(j + 1, 17)}${who(j + 1)}</div>`).join(''), 24, 'margin-top:34px') : ''),
        narrow(each(j => `<div style="border-left:5px solid ${k.a};padding:6px 0 6px 22px;margin-bottom:24px;text-align:left">${quote(j)}${who(j)}</div>`)),
        flexWrap(each(j => `<div style="flex:1 1 250px;text-align:${a}"><div style="font-family:Georgia,serif;font-size:72px;line-height:.8;color:${k.a}">“</div>${quote(j)}${who(j)}</div>`), 26),
        narrow(each(j => `<div style="max-width:580px;${j % 2 ? 'margin-left:auto;' : ''}margin-bottom:24px;text-align:left"><div style="background:${k.tint};border-radius:18px;padding:18px 22px">${quote(j)}</div><div style="padding:8px 22px">${who(j)}</div></div>`)),
        // 6 colour cards
        flexWrap(each(j => `<div style="flex:1 1 250px;background:${x.panelBg};border-radius:18px;padding:28px;text-align:${a}"><div style="font-family:Georgia,serif;font-size:60px;line-height:.7;color:${x.dark ? P.accent : 'rgba(255,255,255,.5)'}">“</div>${quote(j, 18, x.onPanel.f)}${who(j, x.onPanel.h)}</div>`), 22),
        // 7 cards with a name circle
        flexWrap(each(j => `<div style="${x.box}flex:1 1 260px;text-align:left"><div style="display:flex;gap:14px;align-items:center;margin-bottom:6px"><div style="width:52px;height:52px;${CIRCLE}background:${P.secondary};color:${P.primary};font-weight:800;font-size:22px">${initial(j)}</div><div>${who(j, P.primary, false)}${stars(false)}</div></div>${quote(j, 18, P.text)}</div>`), 22),
        // 8 wide rows: stars, quote, name
        `<div style="max-width:920px;${mx(a)}">${each(j => `<div style="display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;padding:22px 0;border-bottom:1px solid ${k.line};text-align:left"><div style="flex:0 0 auto">${stars(x.dark)}</div><div style="flex:1 1 320px">${quote(j, 19, k.f, '0')}</div><div style="flex:0 0 auto">${who(j)}</div></div>`)}</div>`,
        // 9 paper notes
        flexWrap(each(j => `<div style="flex:0 1 280px;background:${['#fff7c2', '#e6f4ea', '#e8f0fe'][j % 3]};padding:26px 24px 22px;box-shadow:0 10px 24px rgba(15,23,42,.14);transform:rotate(${[-2, 1.5, -1][j % 3]}deg);text-align:left">${quote(j, 18, '#2b2b2b')}${who(j, '#2b2b2b')}</div>`), 30, 'justify-content:center;padding:10px 0'),
        // 10 outlined cards with a quote badge
        flexWrap(each(j => `<div style="flex:1 1 250px;border:2px solid ${k.a};border-radius:18px;padding:40px 24px 24px;position:relative;text-align:${a}"><div style="position:absolute;top:-24px;left:50%;margin-left:-24px;width:48px;height:48px;border-radius:50%;background:${P.accent};color:#fff;font-family:Georgia,serif;font-size:40px;line-height:62px;text-align:center">“</div>${quote(j)}${who(j)}</div>`), 24, 'padding-top:24px;row-gap:44px')
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    hours(i) {
      const x = ctx(i), { s, c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const day = (j, kk = k, st = '') => x.t(`rows.${j}.day`, 'span', `font-weight:600;color:${kk.h};${st}`);
      const time = (j, kk = k, st = '') => x.t(`rows.${j}.time`, 'span', `color:${kk.f};${st}`);
      const each = fn => c.rows.map((_, j) => fn(j)).join('');
      const table = (kk, max = 580) => `<table style="width:100%;max-width:${max}px;${mx(a)}border-collapse:collapse;text-align:left;font-size:18px">${each(j =>
        `<tr><td style="padding:13px 6px;border:0;border-bottom:1px solid ${kk.line}">${day(j, kk)}</td><td style="padding:13px 6px;border:0;border-bottom:1px solid ${kk.line};text-align:right">${time(j, kk)}</td></tr>`)}</table>`;
      const dots = kk => each(j => `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:14px;text-align:left">${day(j, kk)}<span style="flex:1;border-bottom:2px dotted ${kk.line};transform:translateY(-4px)"></span>${time(j, kk, 'white-space:nowrap')}</div>`);
      const note = (kk = k) => strip(c.note) ? x.t('note', 'p', `font-size:16px;margin:16px 0 0;color:${kk.f};font-style:italic`) : '';
      const inner = [
        x.h2() + `<div style="max-width:640px;${mx(a)}">${table(k)}${note()}</div>`,
        x.h2() + `<div style="max-width:580px;${mx(a)}">${dots(k)}${note()}</div>`,
        row(col(x.h2() + note()) + col(table(k, 9999)), 40),
        row(col(x.img(0, 'height:360px;')) + col(x.h2() + table(k, 9999) + note()), 48),
        x.h2() + x.panel(table(x.onPanel, 9999) + note(x.onPanel), `max-width:640px;${mx(a)}padding:30px;`),
        // 6 one tile per day
        x.h2() + flexWrap(each(j => `<div style="${x.box}flex:0 1 200px;text-align:center;padding:20px 16px">${day(j, kc, 'display:block;margin-bottom:6px')}${time(j, kc, `font-family:${HF()};font-size:20px;font-weight:700;color:${P.primary}`)}</div>`), 14, `justify-content:${jc(a)}`) + note(),
        // 7 big clock beside the list
        row(`<div style="flex:0 1 260px;text-align:center"><div style="width:150px;height:150px;${CIRCLE}margin:0 auto 18px;background:${k.tint};font-size:70px">🕑</div>${x.hd(k, 30, false)}</div>` + col(dots(k) + note(), 320), 44),
        // 8 rounded rows
        x.h2() + `<div style="max-width:620px;${mx(a)}">${each(j => `<div style="display:flex;justify-content:space-between;gap:16px;background:${k.tint};border-radius:999px;padding:14px 26px;margin-bottom:10px;text-align:left">${day(j)}${time(j, k, 'font-weight:700')}</div>`)}${note()}</div>`,
        // 9 white card on the photo
        `<div style="border-radius:20px;padding:70px 24px;${overlay(s.imgs[0].src, .4)}"><div style="${x.box}max-width:560px;${mx(a)}padding:34px">${x.hd(kc)}${table(kc, 9999)}${note(kc)}</div></div>`,
        // 10 big times
        x.h2() + flexWrap(each(j => `<div style="flex:0 1 220px;text-align:${a}">${day(j, k, 'display:block;font-size:15px;letter-spacing:2px;text-transform:uppercase')}${time(j, k, `display:block;font-family:${HF()};font-size:30px;font-weight:800;color:${k.h};margin-top:4px`)}</div>`), 28, `justify-content:${jc(a)}`) + note()
      ][L];
      return sec(i, x, inner);
    },

    event(i) {
      const x = ctx(i), { s, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const head = (kk = k, size = 32) => x.t('heading', 'h2', `font-family:${HF()};font-size:${size}px;font-weight:800;margin:0 0 12px;line-height:1.25;color:${kk.h}`);
      const line = (icon, key, kk = k, just = jc(a)) => `<div style="display:flex;gap:12px;align-items:center;justify-content:${just};margin:8px 0;font-size:19px;color:${kk.f}"><span style="font-size:22px">${icon}</span>${x.t(key, 'span', 'font-weight:600')}</div>`;
      const info = (kk = k, just) => line('📅', 'date', kk, just) + line('🕑', 'time', kk, just) + line('📍', 'place', kk, just);
      const text = (kk = k) => x.t('text', 'p', `font-size:18px;margin:16px 0 24px;color:${kk.f}`);
      const btn = (inBox = false) => x.btn('cta', 'link', inBox);
      const narrow = (html, w = 660) => `<div style="max-width:${w}px;${mx(a)}">${html}</div>`;
      const dateBlock = `<div style="background:${x.panelBg};color:${x.onPanel.h};border-radius:16px;padding:28px 24px;text-align:center;min-width:210px;box-shadow:0 10px 26px rgba(15,23,42,.15)">${x.t('date', 'div', `font-family:${HF()};font-size:26px;font-weight:800;line-height:1.3`)}<div style="opacity:.88;margin-top:8px">${x.t('time', 'span', '')}</div></div>`;
      const inner = [
        row(`<div style="flex:0 1 250px">${dateBlock}</div>` + col(head() + line('📍', 'place') + text() + btn()), 40),
        narrow(head() + info() + text() + btn()),
        row(col(x.img(0, 'height:380px;')) + col(head() + info() + text() + btn()), 48),
        x.panel(head(x.onPanel) + info(x.onPanel) + text(x.onPanel) + btn(x.dark)),
        `<div style="border:3px dashed ${k.a};border-radius:18px;padding:34px 28px;max-width:620px;${mx(a)}">${head()}${info()}${text()}${btn()}</div>`,
        // 6 on a photo
        `<div style="border-radius:20px;padding:90px 28px;${overlay(s.imgs[0].src)}">${narrow(head(WHITE, 38) + info(WHITE) + text(WHITE) + btn())}</div>`,
        // 7 three info cards
        narrow(head(), 720) + flexWrap([['📅', 'date'], ['🕑', 'time'], ['📍', 'place']].map(([ic, key]) => `<div style="${x.box}flex:1 1 200px;text-align:center;padding:26px 18px"><div style="font-size:34px;margin-bottom:8px">${ic}</div>${x.t(key, 'div', `font-size:19px;font-weight:700;color:${P.primary}`)}</div>`).join(''), 18, 'margin:24px 0') + narrow(text() + btn(), 720),
        // 8 poster
        `<div style="text-align:center;max-width:780px;margin:0 auto">${head(k, 50)}<div style="border-top:2px solid ${k.a};border-bottom:2px solid ${k.a};padding:14px 0;margin:18px 0;display:flex;flex-wrap:wrap;gap:8px 26px;justify-content:center;font-size:19px;font-weight:700;color:${k.h}">${x.t('date', 'span', '')}<span aria-hidden="true">·</span>${x.t('time', 'span', '')}<span aria-hidden="true">·</span>${x.t('place', 'span', '')}</div>${text()}${btn()}</div>`,
        // 9 wide photo with a card overlapping it
        x.img(0, 'height:400px;') + `<div style="position:relative;margin:-100px auto 0;max-width:640px;${x.box}padding:34px;text-align:${a}">${head(kc)}${info(kc)}${text(kc)}${btn(true)}</div>`,
        // 10 colour side panel with the details
        split(`<div style="flex:1 1 260px;background:${x.panelBg};padding:38px 30px;display:flex;flex-direction:column;justify-content:center">${info(x.onPanel, 'flex-start')}</div>`, `<div style="flex:2 1 320px;background:#fff;padding:38px 32px">${head(kc)}${text(kc)}${btn(true)}</div>`)
      ][L];
      return sec(i, x, inner);
    },

    team(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const name = (j, kk = k, mt = 14, st = '') => x.t(`items.${j}.name`, 'div', `font-family:${HF()};font-size:21px;font-weight:700;color:${kk.h};margin-top:${mt}px;${st}`);
      const role = (j, kk = k, st = '') => x.t(`items.${j}.role`, 'div', `font-size:16px;color:${kk.f};${st}`);
      const each = fn => c.items.map((_, j) => fn(j)).join('');
      const round = (j, size) => x.img(j, `width:${size}px;height:${size}px;border-radius:50%;${mx(a)}box-shadow:0 8px 22px rgba(15,23,42,.15)`);
      const inner = [
        flexWrap(each(j => `<div style="flex:1 1 210px;text-align:${a}">${round(j, 160)}${name(j)}${role(j)}</div>`), 28),
        flexWrap(each(j => `<div style="${x.box}flex:1 1 230px;text-align:${a};padding:0;overflow:hidden">${x.img(j, 'height:250px;border-radius:0;')}<div style="padding:4px 20px 20px">${name(j, kc)}${role(j, kc)}</div></div>`), 24),
        `<div style="max-width:640px;${mx(a)}">${each(j => `<div style="display:flex;gap:18px;align-items:center;text-align:left;margin-bottom:18px">${x.img(j, 'width:96px;height:96px;border-radius:50%;flex:none;')}<div>${name(j, k, 0)}${role(j)}</div></div>`)}</div>`,
        flexWrap(each(j => `<div style="flex:1 1 40%;min-width:250px;text-align:${a}">${x.img(j, 'height:300px;')}${name(j)}${role(j)}</div>`), 28),
        `<div style="display:flex;gap:22px;overflow-x:auto;padding-bottom:8px">${each(j => `<div style="flex:none;width:250px;text-align:${a}">${x.img(j, 'height:250px;')}${name(j)}${role(j)}</div>`)}</div>`,
        // 6 name on the photo
        flexWrap(each(j => `<div style="flex:1 1 240px;position:relative;border-radius:${x.r}px;overflow:hidden">${x.img(j, 'height:320px;border-radius:0;')}<div style="position:absolute;left:0;right:0;bottom:0;padding:50px 18px 16px;background:linear-gradient(transparent,rgba(10,15,30,.85));text-align:left">${name(j, WHITE, 0)}${role(j, WHITE)}</div></div>`), 20),
        // 7 photos in tinted frames
        flexWrap(each(j => `<div style="flex:1 1 220px;text-align:center"><div style="background:${k.tint};padding:14px;border-radius:${x.r + 6}px">${x.img(j, 'height:240px;')}</div>${name(j)}${role(j)}</div>`), 24),
        // 8 first person large, the others listed beside
        row(col(x.img(0, 'height:380px;'), 280) + col(`<div style="text-align:left">${name(0, k, 0, 'font-size:32px')}${role(0, k, 'font-size:19px;margin-bottom:22px')}${c.items.slice(1).map((_, j) => `<div style="display:flex;gap:16px;align-items:center;margin-top:16px">${x.img(j + 1, 'width:80px;height:80px;border-radius:50%;flex:none;')}<div>${name(j + 1, k, 0)}${role(j + 1)}</div></div>`).join('')}</div>`, 300), 44),
        // 9 round photos with a colour ring
        flexWrap(each(j => `<div style="flex:1 1 210px;text-align:center">${x.img(j, `width:170px;height:170px;border-radius:50%;margin:0 auto;border:5px solid ${P.accent};padding:6px;background:${x.bg}`)}<div style="display:inline-block;margin-top:14px;background:${k.tint};border-radius:999px;padding:6px 18px">${name(j, k, 0, 'font-size:19px')}</div>${role(j, k, 'margin-top:6px')}</div>`), 28),
        // 10 black-and-white photos
        flexWrap(each(j => `<div style="flex:1 1 220px">${x.img(j, 'height:300px;filter:grayscale(1);')}<div style="border-left:4px solid ${k.a};padding-left:12px;margin-top:14px;text-align:left">${name(j, k, 0)}${role(j)}</div></div>`), 24)
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    faq(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false);
      const q = (j, pre = '', color = k.h, m = '0 0 6px') => `<div style="font-family:${HF()};font-size:21px;font-weight:700;color:${color};margin:${m}">${pre}${x.t(`items.${j}.q`, 'span', '')}</div>`;
      const ans = (j, pre = '', color = k.f) => `<div style="font-size:17px;line-height:1.7;color:${color};display:flex">${pre}${x.t(`items.${j}.a`, 'span', '')}</div>`;
      const line = `border-bottom:1px solid ${k.line};padding:18px 0;`;
      const lab = (t, bg) => `<span style="display:inline-block;flex:none;width:32px;height:32px;line-height:32px;text-align:center;border-radius:50%;background:${bg};color:#fff;font-family:${BF()};font-size:16px;margin-right:12px;font-style:normal">${t}</span>`;
      const list = fn => `<div style="max-width:780px;${mx(a)}text-align:left">${c.items.map((_, j) => fn(j)).join('')}</div>`;
      const bar = x.dark ? P.accent : P.primary;
      if (L === 8) { // title on the left, questions on the right
        return sec(i, x, row(col(x.hd(k, 38), 260) + col(`<div style="text-align:left">${c.items.map((_, j) => `<div style="${line}">${q(j)}${ans(j)}</div>`).join('')}</div>`, 420), 44));
      }
      const inner = [
        list(j => `<div style="${line}">${q(j)}${ans(j)}</div>`),
        list(j => `<div style="${x.box}margin-bottom:14px;border-left:6px solid ${P.accent}">${q(j, '', P.primary)}${ans(j, '', P.text)}</div>`),
        flexWrap(c.items.map((_, j) => `<div style="flex:1 1 320px;${line}text-align:left">${q(j)}${ans(j)}</div>`).join(''), 0, 'column-gap:44px'),
        list(j => `<div style="${line}">${q(j, `<span style="color:${k.a};font-size:26px;margin-right:6px">${j + 1}.</span>`)}${ans(j)}</div>`),
        list(j => `<div style="${line}">${q(j, lab('Q', x.dark ? 'rgba(255,255,255,.25)' : P.primary))}${ans(j, lab('A', P.accent))}</div>`),
        // 6 fold-out answers (open by default; visitors can close them)
        list(j => `<details open style="${x.box}margin-bottom:12px;padding:0"><summary style="cursor:pointer;list-style:none;padding:18px 22px;display:flex;justify-content:space-between;gap:16px;align-items:center">${q(j, '', P.primary, '0')}<span style="flex:none;width:30px;height:30px;${CIRCLE}background:${P.secondary};color:${P.primary};font-weight:800">+</span></summary><div style="padding:0 22px 20px">${ans(j, '', P.text)}</div></details>`),
        // 7 chat bubbles
        list(j => `<div style="margin-bottom:22px"><div style="max-width:560px;margin-left:auto;background:${bar};border-radius:18px 18px 4px 18px;padding:14px 20px">${q(j, '', '#fff', '0')}</div><div style="max-width:600px;margin-top:8px;background:${x.dark ? '#fff' : k.tint};border-radius:18px 18px 18px 4px;padding:14px 20px">${ans(j, '', x.dark ? P.text : k.f)}</div></div>`),
        // 8 colour question bars
        list(j => `<div style="margin-bottom:16px;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,.08)"><div style="background:${bar};padding:14px 22px">${q(j, '', '#fff', '0')}</div><div style="background:#fff;padding:16px 22px">${ans(j, '', P.text)}</div></div>`),
        null, // 9 is built above
        // 10 big question mark icons
        list(j => `<div style="display:flex;gap:18px;align-items:flex-start;${line}"><div style="flex:none;width:48px;height:48px;${CIRCLE}background:${P.accent};color:#fff;font-family:${HF()};font-size:26px;font-weight:800">?</div><div>${q(j)}${ans(j)}</div></div>`)
      ][L];
      return sec(i, x, x.h2() + inner);
    },

    cta(i) {
      const x = ctx(i), { s, a, L, P } = x, k = x.k(false);
      const text = (color, size = 36) => x.t('heading', 'h2', `font-family:${HF()};font-size:${size}px;font-weight:800;line-height:1.2;margin:0 0 12px;color:${color}`) + x.t('sub', 'p', `font-size:19px;margin:0 0 26px;color:${color};opacity:.92`);
      const narrow = (html, w = 680) => `<div style="max-width:${w}px;${mx(a)}">${html}</div>`;
      const block = (bg, html, extra = '') => `<div style="background:${bg};border-radius:20px;padding:52px 36px;${extra}">${html}</div>`;
      const inner = [
        block(x.panelBg, narrow(text(x.onPanel.h) + x.btn('cta', 'link', x.dark))),
        block(x.dark ? 'rgba(255,255,255,.12)' : P.secondary, `<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between;text-align:left;${a === 'right' ? 'flex-direction:row-reverse;' : ''}"><div style="flex:1 1 320px">${text(k.h, 30).replace('margin:0 0 26px', 'margin:0')}</div><div>${x.btn('cta', 'link')}</div></div>`, 'padding:36px;'),
        block(P.primary, narrow(text('#fff') + x.btn('cta', 'link')), overlay(s.imgs[0].src, .6) + 'padding:80px 36px;'),
        narrow(text(k.h, 44) + x.btn('cta', 'link'), 760),
        `<div style="${x.box}border-left:8px solid ${P.accent};padding:36px;max-width:820px;${mx(a)}">${text(P.primary, 30)}${x.btn('cta', 'link', true)}</div>`,
        // 6 text beside a photo
        `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:32px;background:${x.dark ? 'rgba(255,255,255,.1)' : P.secondary};border-radius:20px;padding:30px;text-align:left;${a === 'right' ? 'flex-direction:row-reverse;' : ''}"><div style="flex:1 1 320px">${text(k.h, 32)}${x.btn('cta', 'link')}</div><div style="flex:1 1 280px">${x.img(0, 'height:260px;')}</div></div>`,
        // 7 outlined box
        `<div style="border:3px solid ${k.h};border-radius:20px;padding:48px 32px;max-width:780px;${mx(a)}">${text(k.h, 34)}${x.btn('cta', 'link')}</div>`,
        // 8 big title, then an accent strip with the line and a white button
        `<div style="max-width:860px;${mx(a)}">${x.t('heading', 'h2', `font-family:${HF()};font-size:44px;font-weight:800;line-height:1.15;margin:0 0 22px;color:${k.h}`)}<div style="background:${P.accent};border-radius:16px;padding:22px 26px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;text-align:left">${x.t('sub', 'p', 'font-size:19px;margin:0;color:#fff;flex:1 1 280px')}${x.btn('cta', 'link', false, false, false, true)}</div></div>`,
        // 9 big pointing icon beside the text
        `<div style="display:flex;flex-wrap:wrap;gap:26px;align-items:center;max-width:840px;${mx(a)}text-align:left;${a === 'right' ? 'flex-direction:row-reverse;' : ''}"><div style="flex:none;width:110px;height:110px;${CIRCLE}background:${k.tint};font-size:50px" aria-hidden="true">👉</div><div style="flex:1 1 300px">${text(k.h, 30)}${x.btn('cta', 'link')}</div></div>`,
        // 10 lines above and below, with a big text link
        `<div style="border-top:2px solid ${k.line};border-bottom:2px solid ${k.line};padding:44px 10px;max-width:840px;${mx(a)}">${text(k.h, 38)}<a class="qp-link" data-s="${i}" data-k="cta" data-h="link" href="${esc(hrefFor(s, 'link'))}" style="font-size:22px;font-weight:800;color:${k.a};text-decoration:underline;text-underline-offset:6px">${s.c.cta}</a> <span style="font-size:22px;color:${k.a}" aria-hidden="true">→</span></div>`
      ][L];
      return sec(i, x, inner);
    },

    contact(i) {
      const x = ctx(i), { c, a, L, P } = x, k = x.k(false), kc = x.k(true);
      const mail = 'mailto:' + strip(c.email);
      const text = (kk = k, m = '0 0 24px') => x.t('text', 'p', `font-size:19px;margin:${m};line-height:1.6;color:${kk.f}`);
      const ICONS = { phone: '📞', email: '✉️', address: '📍' };
      const line = (key, kk = k, just = jc(a)) => strip(c[key]) ? `<div style="margin:12px 0;display:flex;gap:14px;justify-content:${just};align-items:center;font-size:20px;color:${kk.f};text-align:left"><span style="width:44px;height:44px;${CIRCLE}display:inline-flex;background:${kk.tint}">${ICONS[key]}</span>${x.t(key, 'span', 'font-weight:600;word-break:break-word')}</div>` : '';
      const info = (kk = k, just, keys = ['phone', 'email', 'address']) => keys.map(key => line(key, kk, just)).join('');
      const ghost = !strip(c.email) ? '' : `<a class="qp-btn" href="${esc(mail)}" style="display:inline-block;border:2px solid ${k.h};color:${k.h};background:transparent;font-size:18px;font-weight:700;line-height:1.2;padding:14px 30px;border-radius:${x.br}px;text-decoration:none">Send an email</a>`;
      const maps = strip(c.address) ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(strip(c.address)) : '';
      const inner = [
        x.h2() + text() + `<div style="margin-bottom:26px">${info()}</div>` + x.btn('cta', 'link'),
        row(col(x.h2() + text() + x.btn('cta', 'link')) + col(info()), 40),
        x.h2() + text() + info(),
        x.panel(x.hd(x.onPanel) + text(x.onPanel) + x.btn('cta', 'link', x.dark)),
        x.h2() + text() + `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:${jc(a)}">${x.btn('cta', 'link')}${ghost}</div>`,
        // 6 three info cards
        x.h2() + text() + flexWrap(['phone', 'email', 'address'].filter(key => strip(c[key])).map(key => `<div style="${x.box}flex:1 1 220px;text-align:center;padding:28px 18px"><div style="width:60px;height:60px;${CIRCLE}margin:0 auto 12px;background:${P.secondary};font-size:26px">${ICONS[key]}</div>${x.t(key, 'div', `font-size:18px;font-weight:700;color:${P.primary};word-break:break-word`)}</div>`).join(''), 18, 'margin-bottom:28px') + x.btn('cta', 'link'),
        // 7 with a map button (the address is shown once, in the map box)
        row(col(x.h2() + text() + info(k, 'flex-start', ['phone', 'email']) + `<div style="margin-top:22px">${x.btn('cta', 'link')}</div>`, 300)
          + col(`<div style="background:${k.tint};border-radius:20px;padding:36px 28px;text-align:center"><div style="font-size:54px;margin-bottom:6px" aria-hidden="true">📍</div>${x.t('address', 'div', `font-size:20px;font-weight:700;color:${k.h};margin-bottom:18px`)}${maps ? `<a class="qp-btn" href="${esc(maps)}" target="_blank" rel="noopener" style="display:inline-block;background:${x.dark ? P.accent : P.primary};color:#fff;font-size:17px;font-weight:700;padding:12px 24px;border-radius:${x.br}px;text-decoration:none">Open in Maps</a>` : ''}</div>`, 260), 40),
        // 8 big phone number
        `<div style="text-align:center;max-width:780px;margin:0 auto">${x.hd(k, 30, true, 'center')}${text()}${strip(c.phone) ? `<div style="font-family:${HF()};font-size:46px;font-weight:800;color:${k.a};margin:4px 0 18px;line-height:1.2"><span aria-hidden="true">📞 </span><a class="qp-link" data-auto="1" data-s="${i}" data-k="phone" href="${esc(telOf(c.phone))}" style="color:${k.a};text-decoration:none">${c.phone}</a></div>` : ''}<div style="font-size:18px;color:${k.f};display:flex;flex-wrap:wrap;gap:6px 26px;justify-content:center">${strip(c.email) ? `<span>✉️ ${x.t('email', 'span', '')}</span>` : ''}${strip(c.address) ? `<span>📍 ${x.t('address', 'span', '')}</span>` : ''}</div><div style="margin-top:26px">${x.btn('cta', 'link')}</div></div>`,
        // 9 colour side panel and details
        split(`<div style="flex:1 1 280px;background:${x.panelBg};padding:40px 32px">${x.hd(x.onPanel, 32, true, 'left')}${text(x.onPanel)}${x.btn('cta', 'link', x.dark)}</div>`, `<div style="flex:1 1 300px;background:#fff;padding:40px 32px;display:flex;flex-direction:column;justify-content:center">${info(kc, 'flex-start')}</div>`),
        // 10 business card
        `<div style="${x.box}max-width:640px;${mx(a)}padding:0;overflow:hidden;text-align:left"><div style="height:10px;background:${P.accent}"></div><div style="padding:34px 32px">${x.t('heading', 'div', `font-family:${HF()};font-size:28px;font-weight:800;color:${P.primary}`)}${text(kc, '6px 0 18px')}${info(kc, 'flex-start')}<div style="margin-top:18px">${x.btn('cta', 'link', true)}</div></div></div>`
      ][L];
      return sec(i, x, inner);
    },

    footer(i) {
      const x = ctx(i), { s, c, a, P } = x, L = x.L, light = [5, 6, 9].includes(L);
      const bg = light ? P.surface : shade(P.primary, .45), fg = light ? P.text : '#fff', muted = light ? 'rgba(0,0,0,.62)' : 'rgba(255,255,255,.75)';
      const brand = (size = 22, color = light ? P.primary : '#fff') => x.t('brand', 'div', `font-family:${HF()};font-weight:800;font-size:${size}px;color:${color}`);
      const tag = x.t('tagline', 'div', `font-size:16px;color:${muted};margin-top:4px`);
      const copy = x.t('copy', 'div', `font-size:14px;color:${muted}`);
      // footer links are plain text copies of the menu names; they are edited in the menu bar
      const links = (dir = 'row', just = jc(a), color = fg) => `<div style="display:flex;flex-direction:${dir};flex-wrap:wrap;gap:${dir === 'row' ? '6px 22px' : '8px'};justify-content:${just}">${navLinks().map(l => `<a class="qp-link" data-auto="1" href="#${l.s.type}" style="color:${color};text-decoration:none;font-size:16px">${esc(strip(l.s.c.menuLabel))}</a>`).join('')}</div>`;
      const contact = (extra = '') => `<div style="font-size:16px;color:${fg};line-height:1.9;${extra}">${strip(c.phone) ? `<div>📞 ${x.t('phone', 'span', '')}</div>` : ''}${strip(c.email) ? `<div>✉️ ${x.t('email', 'span', '')}</div>` : ''}</div>`;
      const title = t => `<div style="font-weight:700;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${muted};margin-bottom:10px">${t}</div>`;
      const line = `border-top:1px solid ${light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.15)'};margin-top:30px;padding-top:18px`;
      const rev = a === 'right' ? 'flex-direction:row-reverse;' : '';
      const credits = photoCredits(muted);
      const wrap = (html, extra = '') => `<footer class="qp-foot" data-sec="${i}" id="footer" style="background:${bg};color:${fg};padding:52px 20px;font-family:${BF()};font-size:16px;line-height:1.6;${light ? 'border-top:1px solid rgba(0,0,0,.08);' : ''}${extra}"><div style="max-width:1080px;margin:0 auto">${html}${credits}</div></footer>`;
      if (L === 8) { // tagline on an accent band, then a dark strip
        return `<footer class="qp-foot" data-sec="${i}" id="footer" style="font-family:${BF()};font-size:16px;line-height:1.6;color:#fff"><div style="background:${P.accent};padding:44px 20px;text-align:${a}"><div style="max-width:1080px;margin:0 auto">${x.t('tagline', 'div', `font-family:${HF()};font-size:30px;font-weight:800;line-height:1.3;color:#fff`)}</div></div>`
          + `<div style="background:${shade(P.primary, .45)};padding:26px 20px"><div style="max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:center">${brand(19, '#fff')}${links('row', 'center', '#fff')}${copy}</div><div style="max-width:1080px;margin:0 auto">${credits}</div></div></footer>`;
      }
      const tel = strip(c.phone) ? telOf(c.phone) : '';
      const inner = [
        `<div style="text-align:center">${brand()}${tag}<div style="margin:22px 0">${links('row', 'center')}</div>${copy}</div>`,
        `<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:center;${rev}"><div>${brand()}${tag}</div>${links()}</div><div style="${line}">${copy}</div>`,
        `<div style="display:flex;flex-wrap:wrap;gap:32px;text-align:left"><div style="flex:2 1 260px">${brand()}${tag}</div><div style="flex:1 1 160px">${title('Menu')}${links('column', 'flex-start')}</div><div style="flex:1 1 200px">${title('Contact')}${contact()}</div></div><div style="${line}">${copy}</div>`,
        `<div style="text-align:${a}">${brand(40)}${tag}<div style="margin-top:18px">${contact(`display:flex;flex-wrap:wrap;gap:4px 24px;justify-content:${jc(a)}`)}</div><div style="${line}">${copy}</div></div>`,
        `<div style="display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:center;${rev}"><div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap">${brand(19)}${copy}</div>${links()}</div>`,
        // 6 light, centered, with an accent line
        `<div style="text-align:center"><div style="width:60px;height:4px;background:${P.accent};margin:0 auto 18px;border-radius:2px"></div>${brand()}${tag}<div style="margin:18px 0">${links('row', 'center')}</div>${contact('display:flex;flex-wrap:wrap;gap:4px 24px;justify-content:center')}<div style="margin-top:14px">${copy}</div></div>`,
        // 7 light, name and contact side by side
        `<div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;text-align:left;${rev}"><div style="flex:1 1 260px">${brand()}${tag}</div><div style="flex:0 1 auto">${contact()}</div></div><div style="margin-top:20px">${links()}</div><div style="${line}">${copy}</div>`,
        // 8 dark, with a big call button
        `<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:center;${rev}"><div>${brand(24)}${tag}</div>${tel ? `<a class="qp-btn" data-auto="1" href="${esc(tel)}" style="display:inline-block;background:${P.accent};color:#fff;font-size:18px;font-weight:700;padding:14px 28px;border-radius:${x.br}px;text-decoration:none">📞 ${esc(strip(c.phone))}</a>` : ''}</div><div style="${line};display:flex;flex-wrap:wrap;gap:10px 24px;justify-content:space-between;align-items:center">${links()}${copy}</div>`,
        null, // 9 is built above
        // 10 minimal, light, centered
        `<div style="text-align:center;font-size:15px">${brand(18)}<div style="margin:10px 0">${links('row', 'center')}</div>${copy}</div>`
      ][L];
      return wrap(inner, L === 9 ? 'padding:30px 20px;' : '');
    }
  };

  // Page-wide styles: fonts, smooth scrolling for the menu links, hover effects and phone sizes.
  function pageCSS() {
    const P = TH(), fonts = [...new Set([P.font, P.body])].map(f => 'family=' + f.replace(/ /g, '+') + ':wght@400;600;700;800').join('&');
    return `<style data-qp="1">@import url('https://fonts.googleapis.com/css2?${fonts}&display=swap');
html{scroll-behavior:smooth}
.qp-nav{position:sticky;top:0;z-index:50}
.qp-btn{transition:transform .15s ease,box-shadow .15s ease,filter .15s ease}
.qp-btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.qp-link{transition:opacity .15s ease}
.qp-link:hover{opacity:.65}
.qp-sec summary::-webkit-details-marker{display:none}
@media (max-width:640px){
.qp-sec{padding-top:48px!important;padding-bottom:48px!important;padding-left:18px!important;padding-right:18px!important}
.qp-sec h1{font-size:34px!important}
.qp-sec h2{font-size:26px!important}
.qp-navlinks{flex-wrap:nowrap!important;overflow-x:auto;justify-content:flex-start!important;width:100%;padding-bottom:4px}
}</style>`;
  }
  const render = () => pageCSS() + state.sections.map((s, i) => R[s.type](i)).join('');
  function renderWith(k) { const keep = state.theme; state.theme = k; try { return render(); } finally { state.theme = keep; } }

  // Pull text, link and photo edits made on the page back into the state, so re-layouts keep them.
  function syncFromEditor() {
    if (!state) return;
    const $d = $('<div>').html(getHTML());
    $d.find('[data-s][data-k]').each(function () {
      const s = state.sections[+this.dataset.s];
      if (s && typeof getPath(s.c, this.dataset.k) === 'string') setPath(s.c, this.dataset.k, this.innerHTML);
    });
    $d.find('a[data-s][data-h]').each(function () {
      const s = state.sections[+this.dataset.s];
      if (s && this.dataset.h in s.c) s.c[this.dataset.h] = esc(this.getAttribute('href') || '');
    });
    $d.find('img[data-s][data-i]').each(function () {
      const im = state.sections[+this.dataset.s]?.imgs[+this.dataset.i];
      if (im) im.src = this.getAttribute('src');
    });
  }

  function save() { ls.set('htmlqr-ai-state', state ? JSON.stringify(state) : ''); }
  function paint(sync = true) {
    if (sync) syncFromEditor();
    const $e = $('#editor');
    if ($e.summernote('codeview.isActivated')) $e.summernote('codeview.deactivate');
    $e.summernote('code', render());
    refresh();
    save();
    hideHover();
    if (designIdx != null) { if (designIdx >= state.sections.length) closeDesign(); else { fillDesign(); markSel(); } }
  }

  // ---------- styles for the editing tools ----------
  $('head').append(`<style>
    .note-btn.btn-ai { background:#0d4ea6 !important; color:#fff !important; padding:0 12px; }
    .note-editable .qp-nav { position:relative !important; z-index:auto !important; }
    .pb-layer { position:absolute; inset:0; pointer-events:none; z-index:60; }
    .pb-layer > * { pointer-events:auto; position:absolute; }
    .pb-outline, .pb-sel { pointer-events:none !important; border:2px solid #3a8ee6; border-radius:6px; box-shadow:0 0 0 4px rgba(58,142,230,.15); display:none; }
    .pb-sel { border:3px solid #ff2a7f; box-shadow:0 0 0 5px rgba(255,42,127,.15); }
    .pb-chip { display:none; pointer-events:none !important; background:#3a8ee6; color:#fff; font:600 12px/1 Poppins,sans-serif; letter-spacing:.6px; text-transform:uppercase; padding:6px 10px; border-radius:6px 6px 0 0; transform:translateY(-100%); white-space:nowrap; }
    .pb-bar { display:none; gap:2px; align-items:center; background:#fff; padding:4px; border-radius:10px; box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.08); font-family:Poppins,sans-serif; flex-wrap:wrap; max-width:calc(100% - 16px); }
    .pb-b { background:transparent; color:#1f2937; border:none; border-radius:7px; padding:7px 10px; font-size:14px; line-height:1.2; white-space:nowrap; cursor:pointer; }
    .pb-b i { margin-right:5px; }
    .pb-b:hover { background:#eef4fc; color:#0d4ea6; }
    .pb-b:disabled { opacity:.3; cursor:not-allowed; background:transparent; }
    .pb-b.pb-move { cursor:grab; }
    .pb-b.pb-ai { color:#6d28d9; }
    .pb-b.pb-ai:hover { background:#f3edff; }
    .pb-b.pb-del { color:#c0392b; }
    .pb-b.pb-del:hover { background:#fde8e8; }
    .pb-sep { width:1px; height:22px; background:#e5e7eb; margin:0 3px; }
    .pb-add { display:none; transform:translate(-50%,-50%); background:#ff2a7f; color:#fff; border:3px solid #fff; border-radius:22px; padding:7px 18px; font-size:15px; font-family:Poppins,sans-serif; box-shadow:0 4px 14px rgba(0,0,0,.25); cursor:pointer; white-space:nowrap; }
    .pb-add:hover { background:#e01e6c; }
    .pb-drop { display:none; height:6px; background:#ff2a7f; border-radius:3px; pointer-events:none !important; box-shadow:0 0 0 2px #fff; }
    .pb-tip { display:none; background:#1f2937; color:#fff; border-radius:8px; padding:6px 6px 6px 12px; font-size:14px; font-family:Poppins,sans-serif; box-shadow:0 6px 18px rgba(0,0,0,.25); align-items:center; gap:8px; max-width:460px; }
    .pb-tip span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pb-tip .pb-b { background:#fff; }
    .pb-imgbar { display:none; gap:2px; align-items:center; background:rgba(255,255,255,.97); padding:3px; border-radius:9px; box-shadow:0 6px 18px rgba(15,23,42,.25); font-family:Poppins,sans-serif; z-index:2; }
    .pb-imgbar .pb-b { padding:6px 9px; }
    .pb-imgdrop { display:none; pointer-events:none !important; border:4px solid #ff2a7f; border-radius:8px; }
    .pb-upload { display:flex; flex-direction:column; align-items:center; gap:2px; background:#ff2a7f; color:#fff; border-radius:10px; padding:16px; font-size:18px; font-weight:600; cursor:pointer; margin-bottom:6px; text-align:center; }
    .pb-upload:hover { background:#e01e6c; }
    .pb-upload small { font-size:13px; font-weight:400; opacity:.9; }
    .pb-or { text-align:center; color:#888; font-size:14px; margin:12px 0; border-top:1px solid #e5e7eb; height:10px; }
    .pb-or span { background:#fff; padding:0 10px; position:relative; top:-12px; }
    .note-editable img { cursor:pointer; }
    .pb-panel { position:fixed; top:70px; right:16px; width:340px; max-height:calc(100vh - 90px); background:#fff; border-radius:12px; box-shadow:0 14px 44px rgba(0,0,0,.3); z-index:1040; display:none; flex-direction:column; font-family:Poppins,sans-serif; color:#222; }
    .pb-ph { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eee; font-size:17px; }
    .pb-x { background:none; border:none; font-size:22px; color:#888; line-height:1; }
    .pb-pb { padding:4px 16px 12px; overflow-y:auto; }
    .pb-lab { font-weight:600; font-size:15px; margin:16px 0 6px; }
    .pb-lab small { font-weight:400; color:#777; }
    .pb-styles { display:grid; grid-template-columns:1fr; gap:4px; }
    .pb-opt { background:#f1f4f7; border:2px solid transparent; border-radius:7px; padding:7px 10px; font-size:14px; text-align:left; color:#222; }
    .pb-opt:hover { background:#e6edf5; }
    .pb-opt.on { border-color:#0d4ea6; background:#fff; font-weight:600; }
    .pb-opt:disabled { opacity:.4; }
    .pb-seg { display:flex; gap:6px; flex-wrap:wrap; }
    .pb-seg .pb-opt { flex:1; text-align:center; }
    .pb-check { display:flex; align-items:center; gap:8px; padding:6px 4px; font-size:15px; margin:0; cursor:pointer; }
    .pb-check input { width:18px; height:18px; }
    .pb-pf { padding:12px 16px; border-top:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
    @media (max-width:600px) { .pb-panel { top:auto; bottom:0; right:0; left:0; width:auto; max-height:70vh; border-radius:12px 12px 0 0; } }
    .pb-addgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:12px; }
    .pb-addcard { background:#f6f8fa; border:2px solid #e3e7eb; border-radius:10px; padding:14px; text-align:left; color:#222; }
    .pb-addcard:hover { border-color:#0d4ea6; background:#fff; }
    .pb-addcard b { display:block; font-size:16px; margin:4px 0 2px; }
    .pb-addcard span.ic { font-size:26px; }
    .pb-addcard small { color:#666; font-size:13px; line-height:1.4; display:block; }
    .pb-lk { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
    .pb-lk .pb-opt { text-align:center; padding:12px 8px; font-size:15px; }
    .th-row { display:flex; gap:22px; overflow-x:auto; padding:4px 4px 16px; justify-content:center; flex-wrap:wrap; }
    .th-card { flex:none; width:280px; background:#fff; box-shadow:0 1px 6px rgba(0,0,0,.22); border-radius:6px; overflow:hidden; display:flex; flex-direction:column; border:3px solid transparent; }
    .th-card.on { border-color:#3a8ee6; }
    .th-thumb { width:280px; height:330px; overflow:hidden; position:relative; background:#fff; }
    .th-thumb iframe { width:800px; height:943px; border:0; transform:scale(.35); transform-origin:0 0; pointer-events:none; }
    .th-meta { padding:10px 12px 12px; text-align:center; font-family:Poppins,sans-serif; }
    .th-name { font-size:17px; color:#2b2b2b; margin-bottom:6px; }
    .th-dots { display:flex; justify-content:center; gap:6px; margin-bottom:10px; }
    .th-dots i { width:18px; height:18px; border-radius:50%; border:1px solid rgba(0,0,0,.12); display:inline-block; }
    .th-font { font-size:13px; color:#666; margin-bottom:10px; }
    #imgGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; min-height:100px; }
    #imgGrid img { width:100%; height:100px; object-fit:cover; border-radius:4px; cursor:pointer; border:3px solid transparent; }
    #imgGrid img:hover { border-color:#ff2a7f; }
    #imgSlots img { width:70px; height:48px; object-fit:cover; border-radius:3px; cursor:pointer; border:3px solid transparent; margin-right:6px; }
    #imgSlots img.on { border-color:#0d4ea6; }
  </style>`);

  // ---------- overlays on the editing area (never part of the page HTML) ----------
  // This script loads before the editor starts, so the layer is attached in mount() once it exists.
  let $area = $(), $edit = $();
  const LAYER = `<div class="pb-layer" id="pbLayer">
    <div class="pb-outline" id="pbOutline"></div>
    <div class="pb-chip" id="pbChip"></div>
    <div class="pb-sel" id="pbSel"></div>
    <div class="pb-drop" id="pbDrop"></div>
    <div class="pb-bar" id="pbBar">
      <button class="pb-b" data-act="up" title="Move this section up"><i class="fas fa-arrow-up"></i>Up</button>
      <button class="pb-b" data-act="down" title="Move this section down"><i class="fas fa-arrow-down"></i>Down</button>
      <button class="pb-b pb-move" id="pbMove" draggable="true" title="Drag to move this section"><i class="fas fa-arrows-alt"></i>Move</button>
      <span class="pb-sep" data-grp="move"></span>
      <button class="pb-b" data-act="design" title="Change the look"><i class="fas fa-palette"></i>Design</button>
      <button class="pb-b" data-act="addimg" title="Add a photo to this gallery"><i class="fas fa-plus"></i>Add photo</button>
      <button class="pb-b" data-act="swap" title="Change to another kind of section"><i class="fas fa-exchange-alt"></i>Swap</button>
      <button class="pb-b pb-ai" data-act="rewrite" title="Write fresh text with AI"><i class="fas fa-magic"></i>Rewrite</button>
      <span class="pb-sep" data-grp="del"></span>
      <button class="pb-b pb-del" data-act="del" title="Delete this section"><i class="far fa-trash-alt"></i>Delete</button>
    </div>
    <button class="pb-add" id="pbAdd"><i class="fas fa-plus"></i> Add a section here</button>
    <div class="pb-imgbar" id="pbImg">
      <button class="pb-b" data-img="left" title="Move this photo left"><i class="fas fa-arrow-left"></i></button>
      <button class="pb-b" data-img="right" title="Move this photo right"><i class="fas fa-arrow-right"></i></button>
      <button class="pb-b pb-move" id="pbImgMove" draggable="true" title="Drag to move this photo"><i class="fas fa-arrows-alt"></i>Move</button>
      <button class="pb-b" data-img="change" title="Upload or choose another photo"><i class="fas fa-camera"></i><span>Change</span></button>
      <button class="pb-b pb-del" data-img="del" title="Remove this photo"><i class="far fa-trash-alt"></i>Remove</button>
    </div>
    <div class="pb-imgdrop" id="pbImgDrop"></div>
    <div class="pb-tip" id="pbTip"><i class="fas fa-link"></i><span id="pbTipText"></span><button class="pb-b" id="pbTipGo">Go there</button><button class="pb-b" id="pbTipEdit">Change link</button></div>
  </div>`;

  $('body').append(`
  <div class="pb-panel" id="pbPanel" role="dialog" aria-label="Design">
    <div class="pb-ph"><b id="dpTitle">Design</b><button class="pb-x" id="dpClose" aria-label="Close">&times;</button></div>
    <div class="pb-pb">
      <div class="pb-lab">Design <small>(10 designs)</small></div><div class="pb-styles" id="dpStyles"></div>
      <div class="pb-lab">Position <small>(each design has 3)</small></div>
      <div class="pb-seg" id="dpAlign"><button class="pb-opt" data-v="left"><i class="fas fa-align-left"></i> Left</button><button class="pb-opt" data-v="center"><i class="fas fa-align-center"></i> Center</button><button class="pb-opt" data-v="right"><i class="fas fa-align-right"></i> Right</button></div>
      <div id="dpExtra"></div>
    </div>
    <div class="pb-pf"><button class="pb-b" id="dpTheme" style="border:1px solid #d5dbe1"><i class="fas fa-palette"></i>Colours</button><button class="btn-prev" id="dpDone">Done</button></div>
    <input type="file" id="logoUp" accept="image/*" hidden>
  </div>

  <div class="modal fade" id="addModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title" id="addTitle">Add a section</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
    <div class="modal-body"><div class="pb-lab" style="margin-top:0">Suggested for your page</div><div class="pb-addgrid" id="addMain"></div>
      <div class="pb-lab">More sections</div><div class="pb-addgrid" id="addMore"></div>
      <small class="text-muted d-block mt-3">Besides the menu bar and footer, a page has ${MIN_CONTENT} to ${MAX_CONTENT} sections.</small></div>
  </div></div></div>

  <div class="modal fade" id="themeModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered" style="max-width:1000px"><div class="modal-content tpl-content">
    <button type="button" class="tpl-close" data-dismiss="modal" aria-label="Close">&#10006;</button>
    <h2 class="tpl-title">Pick your colours</h2>
    <p class="text-center text-muted" style="margin:-6px 0 16px;font-size:15px">Three colour themes made for your page. Click one to use it. To change it later, open <b>Design</b> on any section and press <b>Colours</b>.</p>
    <div class="th-row" id="themeRow"></div>
  </div></div></div>

  <div class="modal fade" id="linkModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">Where should this go?</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
    <div class="modal-body">
      <div class="pb-lk" id="lkKinds">
        <button class="pb-opt" data-v="tel">📞 Call a phone number</button><button class="pb-opt" data-v="mailto">✉️ Send an email</button>
        <button class="pb-opt" data-v="web">🌐 Open a website</button><button class="pb-opt" data-v="sec">⬇️ Go to a section</button>
      </div>
      <label class="t" for="lkVal" id="lkLabel">Phone number</label>
      <input id="lkVal" class="form-control" style="font-size:16px">
      <select id="lkSec" class="form-control" style="font-size:16px;display:none"></select>
      <div id="lkErr" class="text-danger mt-2" style="font-size:14px"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-light" data-dismiss="modal">Cancel</button><button class="btn-prev" id="lkSave">Save</button></div>
  </div></div></div>

  <div class="modal fade" id="aiModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title"><i class="fas fa-robot"></i> AI generation</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
    <div class="modal-body">
      <label class="t" for="aiCat">Type of page</label>
      <select id="aiCat" class="form-control mb-3" style="font-size:16px">${Object.keys(INDUSTRIES).map(k => `<option>${k}</option>`).join('')}</select>
      <label class="t" for="aiDesc">Describe your page</label>
      <textarea id="aiDesc" class="form-control" rows="4" style="font-size:16px" placeholder="Example: Bella Napoli, a family Italian restaurant in Dubai Marina. 20% off all pizzas this weekend with code PIZZA20. Call +971 4 123 4567."></textarea>
      <small class="text-muted">Tip: include your name, phone number, address, offers, prices or a timetable.</small>
      <div id="aiNote" class="mt-2" style="font-size:13px;color:#8a5a00;display:none">AI is not set up on this server yet, so a sample page is made from the design library.</div>
      <div id="aiErr" class="text-danger mt-2" style="font-size:14px"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-light" data-dismiss="modal">Cancel</button>
      <button class="btn-prev" id="aiGo"><i class="fas fa-robot"></i> Generate</button></div>
  </div></div></div>

  <div class="modal fade" id="imgModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title" id="imgTitle">Change photo</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
    <div class="modal-body">
      <div id="imgSlots" class="mb-2"></div>
      <label class="pb-upload"><i class="fas fa-upload"></i> Upload your own photo<small>JPG or PNG from your computer or phone</small><input type="file" id="imgUp" accept="image/*" hidden></label>
      <div class="pb-or"><span>or choose a free photo</span></div>
      <div class="input-group mb-3"><input id="imgQ" class="form-control" style="font-size:16px" placeholder="Search free photos, e.g. pizza">
        <div class="input-group-append"><button class="btn btn-light" id="imgSearch"><i class="fas fa-search"></i> Search</button></div></div>
      <div id="imgGrid"></div>
      <small class="text-muted d-block mt-2">Free photos from Openverse and Wikimedia Commons that may be used by businesses. Click a photo to use it.</small>
    </div>
  </div></div></div>`);

  // ---------- hover: section tools, add button, photo button, link tip ----------
  let hoverIdx = null, designIdx = null, dragFrom = null, tipLink = null, photoEl = null, tipTimer = null, imgDrag = null;
  const secEls = () => $edit.find('[data-sec]').toArray();
  const rel = el => { const r = el.getBoundingClientRect(), b = $area[0].getBoundingClientRect(); return { top: r.top - b.top, left: r.left - b.left, width: r.width, height: r.height, bottom: r.bottom - b.top }; };
  const codeview = () => $('#editor').summernote('codeview.isActivated');

  function place($el, el, pad = 0) { const r = rel(el); $el.css({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }).show(); }
  function hideHover() { hoverIdx = null; $('#pbOutline,#pbChip,#pbBar,#pbAdd,#pbImg').hide(); $('#pbTip').css('display', 'none'); }
  function showSection(i) {
    const el = secEls()[i]; if (!el || !state) return;
    hoverIdx = i;
    const n = state.sections.length, s = state.sections[i], fixed = FIXED.has(s.type), cc = contentCount();
    place($('#pbOutline'), el);
    const r = rel(el);
    $('#pbChip').text(`${TYPEINFO[s.type].icon} ${TYPEINFO[s.type].name}`).css({ top: Math.max(r.top, 22), left: r.left }).show();
    $('#pbBar [data-act=up], #pbBar [data-act=down], #pbMove, #pbBar [data-grp=move]').toggle(!fixed);
    $('#pbBar [data-act=up]').prop('disabled', i <= 2);
    $('#pbBar [data-act=down]').prop('disabled', i >= n - 2);
    $('#pbBar [data-act=swap], #pbBar [data-act=del], #pbBar [data-grp=del]').toggle(!fixed);
    $('#pbBar [data-act=del]').prop('disabled', cc <= MIN_CONTENT);
    $('#pbBar [data-act=rewrite]').toggle(s.type !== 'nav');
    $('#pbBar [data-act=addimg]').toggle(s.type === 'gallery').prop('disabled', s.imgs.length >= GALLERY.max);
    const $bar = $('#pbBar').css({ display: 'flex', left: 0 }); // measure at full width before placing it
    const top = r.height < 150 ? r.bottom + 6 : Math.min(Math.max(r.top, -$area[0].getBoundingClientRect().top + 8), r.bottom - 60) + 10;
    $bar.css({ top, left: Math.max(r.left + 8, r.left + r.width - $bar.outerWidth() - 10) });
    const canAdd = s.type !== 'footer' && s.type !== 'nav' && cc < MAX_CONTENT;
    $('#pbAdd').toggle(canAdd).css({ top: r.bottom, left: r.left + r.width / 2 });
  }
  function markSel() {
    const el = designIdx != null && secEls()[designIdx];
    if (el) place($('#pbSel'), el); else $('#pbSel').hide();
  }

  function mount() {
    $area = $('.note-editing-area'); $edit = $('.note-editable');
    $area.append(LAYER);

    $area.on('mousemove', e => {
      if (dragFrom != null) return;
      if (codeview()) return hideHover();
      if ($(e.target).closest('#pbLayer').length) return; // over our own buttons
      const secEl = $(e.target).closest('[data-sec]', $edit[0])[0];
      if (secEl && state) { const i = +secEl.dataset.sec; if (i !== hoverIdx) showSection(i); }
      else if (!secEl) { hoverIdx = null; $('#pbOutline,#pbChip,#pbBar,#pbAdd').hide(); }
      const img = $(e.target).closest('img', $edit[0])[0];
      if (img) showPhotoBar(img);
      else $('#pbImg').hide();
    });
    $area.on('mouseleave', () => { if (dragFrom == null) hideHover(); });
    $(window).on('scroll resize', () => { if (hoverIdx != null) showSection(hoverIdx); markSel(); });

    // link tip
    $edit.on('mouseover', 'a', function () {
      if (codeview()) return;
      clearTimeout(tipTimer); tipLink = this;
      const r = rel(this), h = this.getAttribute('href') || '';
      $('#pbTipText').text(describe(h));
      $('#pbTipGo').toggle(h.length > 1 && h.startsWith('#'));
      $('#pbTipEdit').toggle(!this.dataset.auto);
      $('#pbTip').css({ display: 'flex', top: r.bottom + 6, left: Math.max(0, r.left) });
    });
    $edit.on('mouseout', 'a', () => { tipTimer = setTimeout(() => $('#pbTip').css('display', 'none'), 450); });
    $('#pbTip').on('mouseenter', () => clearTimeout(tipTimer)).on('mouseleave', () => $('#pbTip').css('display', 'none'));
    $('#pbTipEdit').on('click', () => tipLink && openLink(tipLink));
    $('#pbTipGo').on('click', () => { if (tipLink) goTo((tipLink.getAttribute('href') || '').slice(1)); });

    // section tools
    $('#pbBar').on('click', '[data-act]', function () {
      const i = hoverIdx, act = this.dataset.act;
      if (i == null) return;
      if (act === 'up') return move(i, i - 1);
      if (act === 'down') return move(i, i + 2);
      if (act === 'design') return openDesign(i);
      if (act === 'addimg') return openImgAdd(i);
      if (act === 'swap') return openAdd(i, true);
      if (act === 'rewrite') return rewrite(i, this);
      if (act === 'del' && confirm(`Delete the "${TYPEINFO[state.sections[i].type].name}" section?`)) {
        syncFromEditor(); state.sections.splice(i, 1);
        if (designIdx === i) closeDesign(); else if (designIdx > i) designIdx--;
        paint(false);
      }
    });
    $('#pbAdd').on('click', () => openAdd(hoverIdx, false));
    $('#pbImg').on('click', '[data-img]', function () {
      if (!photoEl) return;
      const act = this.dataset.img, si = +photoEl.dataset.s, n = +photoEl.dataset.i;
      if (act === 'change') return openImgFor(photoEl);
      if (act === 'left') return moveImg(si, n, n - 1);
      if (act === 'right') return moveImg(si, n, n + 1);
      if (act === 'del' && confirm('Remove this photo?')) { syncFromEditor(); state.sections[si].imgs.splice(n, 1); paint(false); }
    });
    $edit.on('click', 'img', function () { openImgFor(this); setTimeout(() => $('.note-image-popover').hide(), 0); });

    // drag and drop with the Move button
    $('#pbMove').on('dragstart', e => {
      dragFrom = hoverIdx;
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('application/x-section', String(dragFrom));
      $('#pbBar,#pbAdd,#pbImg,#pbChip').hide();
    }).on('dragend', () => { dragFrom = null; $('#pbDrop').hide(); });
    $('#pbImgMove').on('dragstart', e => {
      imgDrag = { s: +photoEl.dataset.s, n: +photoEl.dataset.i };
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('application/x-photo', '1');
    }).on('dragend', () => { imgDrag = null; $('#pbImgDrop').hide(); });
    $area[0].addEventListener('dragover', e => {
      if (!imgDrag) return;
      e.preventDefault(); e.stopPropagation();
      const t = photoAt(e.clientX, e.clientY);
      if (t) place($('#pbImgDrop'), t, 4);
    }, true);
    $area[0].addEventListener('drop', e => {
      if (!imgDrag) return;
      e.preventDefault(); e.stopPropagation();
      const t = photoAt(e.clientX, e.clientY), from = imgDrag;
      imgDrag = null; $('#pbImgDrop').hide();
      if (t) moveImg(from.s, from.n, +t.dataset.i);
    }, true);
    $area[0].addEventListener('dragover', e => {
      if (dragFrom == null) return;
      e.preventDefault(); e.stopPropagation();
      const els = secEls(), slot = slotAt(e.clientY), r = rel(els[slot]);
      $('#pbDrop').css({ top: r.top - 3, left: r.left + 10, width: r.width - 20 }).show();
    }, true);
    $area[0].addEventListener('drop', e => {
      if (dragFrom == null) return;
      e.preventDefault(); e.stopPropagation();
      const from = dragFrom; dragFrom = null; $('#pbDrop').hide();
      move(from, slotAt(e.clientY));
    }, true);
  }

  // the bar on a hovered photo: gallery photos can be moved and removed, any photo can be changed
  function showPhotoBar(img) {
    photoEl = img;
    const s = state && img.dataset.s != null ? state.sections[+img.dataset.s] : null;
    const inGallery = !!s && s.type === 'gallery' && img.dataset.i != null, n = +img.dataset.i;
    $('#pbImg [data-img=left], #pbImg [data-img=right], #pbImgMove, #pbImg [data-img=del]').toggle(inGallery);
    if (inGallery) {
      $('#pbImg [data-img=left]').prop('disabled', n === 0);
      $('#pbImg [data-img=right]').prop('disabled', n >= s.imgs.length - 1);
      $('#pbImg [data-img=del]').prop('disabled', s.imgs.length <= GALLERY.min);
    }
    $('#pbImg [data-img=change] span').text(img.dataset.logo ? 'Change logo' : inGallery ? 'Change' : 'Change photo');
    const r = rel(img), $bar = $('#pbImg').css({ display: 'flex', left: 0 });
    $bar.css({ top: r.top + 8, left: r.left + Math.max(4, (r.width - $bar.outerWidth()) / 2) });
  }
  function moveImg(si, from, to) {
    const imgs = state.sections[si].imgs;
    if (to < 0 || to >= imgs.length || to === from) return;
    syncFromEditor();
    imgs.splice(to, 0, imgs.splice(from, 1)[0]);
    paint(false);
  }
  // the gallery photo nearest the pointer, in the gallery being rearranged
  function photoAt(x, y) {
    let best = null, d = Infinity;
    $edit.find(`img[data-s="${imgDrag.s}"][data-i]`).each(function () {
      const r = this.getBoundingClientRect(), dd = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (dd < d) { d = dd; best = this; }
    });
    return best;
  }

  const describe = h => !h || h === '#' ? 'Not set yet'
    : h.startsWith('tel:') ? 'Calls ' + h.slice(4) : h.startsWith('mailto:') ? 'Emails ' + h.slice(7)
    : h.startsWith('#') ? 'Goes to: ' + (TYPEINFO[h.slice(1)]?.name || h.slice(1)) : 'Opens ' + h.replace(/^https?:\/\//, '');
  function goTo(id) {
    const el = $edit.find(`[data-sec]#${CSS.escape(id)}`)[0];
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('#pbTip').css('display', 'none');
    setTimeout(() => { place($('#pbOutline'), el); setTimeout(() => $('#pbOutline').fadeOut(600), 900); }, 500);
  }

  // move section `from` so it lands before slot `to`; the menu bar, hero and footer stay in place
  function move(from, to) {
    const n = state.sections.length;
    const dest = clamp(to > from ? to - 1 : to, 2, n - 2);
    if (from === dest || FIXED.has(state.sections[from].type)) return;
    syncFromEditor();
    const [s] = state.sections.splice(from, 1);
    state.sections.splice(dest, 0, s);
    if (designIdx === from) designIdx = dest;
    paint(false);
    setTimeout(() => { const el = secEls()[dest]; if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
  }
  function slotAt(y) {
    const els = secEls(), n = els.length;
    for (let k = 2; k < n; k++) { const r = els[k].getBoundingClientRect(); if (y < r.top + r.height / 2) return k; }
    return n - 1;
  }

  // ---------- design panel ----------
  function openDesign(i) { designIdx = i; fillDesign(); $('#pbPanel').css('display', 'flex'); markSel(); }
  function closeDesign() { designIdx = null; $('#pbPanel').hide(); $('#pbSel').hide(); }
  const seg = (act, opts, cur) => `<div class="pb-seg">${opts.map(([v, label, dis]) => `<button class="pb-opt ${v === cur ? 'on' : ''}" data-x="${act}" data-v="${v}" ${dis ? 'disabled' : ''}>${label}</button>`).join('')}</div>`;
  function fillDesign() {
    const s = state.sections[designIdx];
    $('#dpTitle').text(`${TYPEINFO[s.type].icon} ${TYPEINFO[s.type].name}`);
    $('#dpStyles').html(Array.from({ length: 10 }, (_, v) => `<button class="pb-opt ${s.variant === v + 1 ? 'on' : ''}" data-v="${v + 1}">${v + 1}. ${designName(s.type, v + 1)}</button>`).join(''));
    $('#dpAlign .pb-opt').each(function () { $(this).toggleClass('on', this.dataset.v === s.align); });
    // extra options for some section types
    let extra = '';
    const key = ITEMS[s.type];
    if (key) {
      const [lo, hi] = ARR_LIMITS[`${s.type}.${key}`], n = s.c[key].length;
      extra += `<div class="pb-lab">Items <small>(${n} now)</small></div>` + seg('items', [['add', '+ Add one', n >= hi], ['remove', '− Remove last', n <= lo]]);
    }
    if (s.type === 'table') {
      extra += `<div class="pb-lab">Rows <small>(${s.c.rows.length})</small></div>` + seg('rows', [['add', '+ Add row', s.c.rows.length >= 12], ['remove', '− Remove last row', s.c.rows.length <= 1]]);
      extra += `<div class="pb-lab">Columns <small>(${s.c.cols.length})</small></div>` + seg('cols', [['add', '+ Add column', s.c.cols.length >= 5], ['remove', '− Remove last column', s.c.cols.length <= 2]]);
    }
    if (s.type === 'nav') {
      extra += `<div class="pb-lab">Logo</div>` + seg('logo', [['upload', '<i class="fas fa-upload"></i> Upload logo'], ['remove', 'Use text', !s.c.logoImg]]);
      extra += `<div class="pb-lab">Menu links <small>(up to 5)</small></div>` + state.sections.map((t, j) => FIXED.has(t.type) ? '' :
        `<label class="pb-check"><input type="checkbox" data-menu="${j}" ${t.menu ? 'checked' : ''}> ${esc(strip(t.c.menuLabel))} <small class="text-muted">(${TYPEINFO[t.type].name})</small></label>`).join('');
      extra += `<small class="text-muted d-block mt-1">Click a link name in the menu bar to rename it.</small>`;
    }
    $('#dpExtra').html(extra);
  }
  const setDesign = fn => { syncFromEditor(); fn(state.sections[designIdx]); paint(false); };
  $('#dpStyles').on('click', '.pb-opt', function () { setDesign(s => { s.variant = +this.dataset.v; }); });
  $('#dpAlign').on('click', '.pb-opt', function () { setDesign(s => { s.align = this.dataset.v; }); });
  $('#dpExtra').on('change', 'input[data-menu]', function () { syncFromEditor(); state.sections[+this.dataset.menu].menu = this.checked; paint(false); });
  $('#dpExtra').on('click', '.pb-opt', function () {
    const what = this.dataset.x, v = this.dataset.v;
    if (what === 'logo' && v === 'upload') return $('#logoUp').trigger('click');
    setDesign(s => {
      if (what === 'items') {
        const key = ITEMS[s.type], list = s.c[key], d = DEF[s.type][key];
        if (v === 'add') { const o = {}; const src = d[list.length % d.length]; for (const kk in src) o[kk] = esc(src[kk]); list.push(o); } else list.pop();
      }
      if (what === 'rows') { if (v === 'add') s.c.rows.push(s.c.cols.map((_, j) => j ? '–' : 'New row')); else s.c.rows.pop(); }
      if (what === 'cols') {
        if (v === 'add') { s.c.cols.push('New column'); s.c.rows.forEach(r => r.push('–')); }
        else { s.c.cols.pop(); s.c.rows.forEach(r => r.pop()); }
      }
      if (what === 'logo' && v === 'remove') s.c.logoImg = '';
    });
  });
  $('#logoUp').on('change', async function () {
    const f = this.files[0]; this.value = '';
    if (!f) return;
    const nav = state.sections.find(s => s.type === 'nav');
    if (nav) { syncFromEditor(); nav.c.logoImg = await shrink(f, 400, 'image/png'); paint(false); }
  });
  $('#dpClose,#dpDone').on('click', closeDesign);
  $('#dpTheme').on('click', openThemes);

  // ---------- themes ----------
  function openThemes() {
    if (!state) return alert('Make a page with "AI generation" first. Then you can pick one of its 3 colour themes here.');
    syncFromEditor();
    $('#themeRow').html(state.themes.map((t, k) => `<div class="th-card ${k === state.theme ? 'on' : ''}">
      <div class="th-thumb"><iframe tabindex="-1" scrolling="no" sandbox="" title="${esc(t.name)}"></iframe></div>
      <div class="th-meta"><div class="th-name">${esc(t.name)}</div>
      <div class="th-dots">${[t.primary, t.accent, t.secondary, t.surface].map(c => `<i style="background:${c}"></i>`).join('')}</div>
      <button class="tpl-select" data-k="${k}">${k === state.theme ? 'In use' : 'Use these colours'}</button></div></div>`).join(''));
    $('#themeRow iframe').each((k, f) => { f.srcdoc = docFor(renderWith(k), state.themes[k].name); });
    $('#themeModal').modal('show');
  }
  $('#themeRow').on('click', '.tpl-select', function () { state.theme = +this.dataset.k; paint(false); $('#themeModal').modal('hide'); });

  // ---------- add or swap a section ----------
  let addAt = 0, swapIdx = null;
  function openAdd(i, swap) {
    swapIdx = swap ? i : null; addAt = i;
    const have = new Set(state.sections.map(s => s.type)), ind = indOf(state);
    if (swap) have.delete(state.sections[i].type);
    const card = t => `<button class="pb-addcard" data-t="${t}"><span class="ic">${TYPEINFO[t].icon}</span><b>${esc(ind.def?.[t]?.heading || TYPEINFO[t].name)}</b><small>${TYPEINFO[t].desc}</small></button>`;
    const main = [...ind.types, 'cta'].filter(t => !have.has(t));
    const more = Object.keys(TYPEINFO).filter(t => !have.has(t) && !main.includes(t) && !FIXED.has(t));
    $('#addTitle').text(swap ? `Swap "${TYPEINFO[state.sections[i].type].name}" for…` : 'Add a section');
    $('#addMain').html(main.map(card).join('') || '<small class="text-muted">All suggested sections are already on your page.</small>');
    $('#addMore').html(more.map(card).join(''));
    $('#addModal').modal('show');
  }
  $('#addModal').on('click', '.pb-addcard', async function () {
    const t = this.dataset.t;
    $('#addModal').modal('hide');
    syncFromEditor();
    const old = swapIdx != null ? state.sections[swapIdx] : null;
    const s = makeSection({ type: t, design: old?.variant || 1, align: old?.align || 'center', radius: state.sections[1]?.radius || 'soft' }, strip(state.title), state.ind, false);
    await fillImages([s], new Set(state.sections.flatMap(x => x.imgs.map(m => m.src))));
    let at;
    if (old) { at = swapIdx; state.sections[at] = s; }
    else { at = clamp(addAt + 1, 2, state.sections.length - 1); state.sections.splice(at, 0, s); if (designIdx != null && designIdx >= at) designIdx++; }
    paint(false);
    setTimeout(() => { const el = secEls()[at]; if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 30);
  });

  // ---------- rewrite one section with AI ----------
  async function rewrite(i, btn) {
    if (!(await aiAvailable())) return alert('Rewrite needs the AI, which is not set up on this server yet.');
    syncFromEditor();
    const s = state.sections[i], plain = {};
    for (const k in s.c) if (!['menuLabel', 'logoImg'].includes(k)) plain[k] = typeof s.c[k] === 'string' ? strip(s.c[k]) : JSON.parse(strip(JSON.stringify(s.c[k])));
    const $b = $(btn).prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Writing…');
    try {
      const out = await chat(`You write the text for ONE section of a one-page website that opens from a QR code. Reply with one JSON object only, no markdown.\n\n${AUDIENCE}`,
        `Page type: ${state.ind}\nPage description: ${state.desc}\nSection type: ${s.type}\nFields to return: ${FIELDS[s.type]}\nCurrent text (write a fresh, clearer version; keep every real fact): ${JSON.stringify(plain)}`, 0.9);
      const ns = makeSection({ ...out, type: s.type, design: s.variant, align: s.align }, strip(state.title), state.ind, true);
      s.c = { ...ns.c, menuLabel: s.c.menuLabel, ...(s.type === 'nav' ? { logoImg: s.c.logoImg } : {}) };
      paint(false);
    } catch (e) { alert(e.message || String(e)); }
    finally { $b.prop('disabled', false).html('<i class="fas fa-magic"></i>Rewrite'); }
  }

  // ---------- links ----------
  let linkEl = null, linkKind = 'tel';
  const KIND_LABEL = { tel: 'Phone number', mailto: 'Email address', web: 'Website address', sec: 'Section' };
  function setKind(k) {
    linkKind = k;
    $('#lkKinds .pb-opt').each(function () { $(this).toggleClass('on', this.dataset.v === k); });
    $('#lkLabel').text(KIND_LABEL[k]);
    $('#lkVal').toggle(k !== 'sec').attr('placeholder', { tel: '+1 555 0100', mailto: 'name@example.com', web: 'www.example.com' }[k] || '');
    $('#lkSec').toggle(k === 'sec');
  }
  function openLink(a) {
    linkEl = a;
    const h = a.getAttribute('href') || '';
    const k = h.startsWith('tel:') ? 'tel' : h.startsWith('mailto:') ? 'mailto' : h.startsWith('#') && state ? 'sec' : 'web';
    $('#lkKinds [data-v=sec]').toggle(!!state);
    if (state) $('#lkSec').html(state.sections.filter(s => s.type !== 'nav').map(s => `<option value="#${s.type}">${esc(TYPEINFO[s.type].name)}</option>`).join(''));
    setKind(k);
    $('#lkVal').val(k === 'tel' ? h.slice(4) : k === 'mailto' ? h.slice(7) : k === 'web' && h !== '#' ? h : '');
    if (k === 'sec') $('#lkSec').val(h);
    $('#lkErr').text('');
    $('#pbTip').css('display', 'none');
    $('#linkModal').modal('show');
  }
  $('#lkKinds').on('click', '.pb-opt', function () { setKind(this.dataset.v); $('#lkVal').val('').trigger('focus'); });
  $('#lkSave').on('click', () => {
    const v = $('#lkVal').val().trim();
    let h;
    if (linkKind === 'sec') h = $('#lkSec').val();
    else if (!v) return $('#lkErr').text('Please fill this in.');
    else if (linkKind === 'tel') h = telOf(v);
    else if (linkKind === 'mailto') { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return $('#lkErr').text('This does not look like an email address.'); h = 'mailto:' + v; }
    else h = /^https?:\/\//i.test(v) ? v : 'https://' + v;
    linkEl.setAttribute('href', h);
    $('#linkModal').modal('hide');
    if (state && linkEl.dataset.s) paint(); else refresh();
  });

  // ---------- photo picker (works on AI pages and on any other page) ----------
  let imgTarget = null; // {s, n} for AI sections, {el} for any other image
  async function showResults(q) {
    $('#imgGrid').html('<span class="text-muted">Searching…</span>');
    const list = await searchAll(q);
    $('#imgGrid').html(list.map(it => `<img src="${esc(it.thumb || it.src)}" data-full="${esc(it.src)}" data-thumb="${esc(it.thumb || '')}" data-credit="${esc(JSON.stringify(it.credit || null))}" loading="lazy" alt="">`).join(''));
  }
  function openImgFor(el) {
    if (el.dataset.logo) return $('#logoUp').trigger('click');
    if (state && el.dataset.s != null && el.dataset.i != null && state.sections[+el.dataset.s]) return openImg(+el.dataset.s, +el.dataset.i);
    imgTarget = { el };
    $('#imgTitle').text('Change photo');
    $('#imgSlots').html('');
    $('#imgQ').val(el.alt || '');
    $('#imgModal').modal('show');
    if (el.alt) showResults(el.alt); else $('#imgGrid').html('<span class="text-muted">Type what the photo should show, then press Search.</span>');
  }
  function openImg(s, n) {
    syncFromEditor();
    imgTarget = { s, n };
    $('#imgTitle').text('Change photo');
    const sec = state.sections[s];
    $('#imgSlots').html(sec.imgs.length > 1 ? '<div class="text-muted mb-1" style="font-size:14px">Which photo?</div>' + sec.imgs.map((im, k) => `<img src="${esc(im.src)}" data-n="${k}" class="${k === n ? 'on' : ''}" alt="Photo ${k + 1}">`).join('') : '');
    $('#imgQ').val(sec.imgs[n].q);
    $('#imgModal').modal('show');
    showResults(sec.imgs[n].q);
  }
  function openImgAdd(s) { // add a photo to a gallery
    syncFromEditor();
    imgTarget = { s, add: true };
    const imgs = state.sections[s].imgs, q = imgs[imgs.length - 1]?.q || (PICS[state.ind] || PICS['Company profile'])[0];
    $('#imgTitle').text('Add a photo');
    $('#imgSlots').html('');
    $('#imgQ').val(q);
    $('#imgModal').modal('show');
    showResults(q);
  }
  function applyImg(src, q, credit = null) {
    if (imgTarget.el) { imgTarget.el.setAttribute('src', src); refresh(); }
    else if (imgTarget.add) { state.sections[imgTarget.s].imgs.push({ q: q || '', src, credit }); paint(false); }
    else { const im = state.sections[imgTarget.s].imgs[imgTarget.n]; Object.assign(im, { src, credit }); if (q) im.q = q; paint(false); }
    $('#imgModal').modal('hide');
  }
  function shrink(file, max = 1200, type = 'image/jpeg') { // keep uploads small enough to live inside the page HTML
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k;
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          res(cv.toDataURL(type, 0.85));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  $('#imgSlots').on('click', 'img', function () { openImg(imgTarget.s, +this.dataset.n); });
  $('#imgSearch').on('click', () => showResults($('#imgQ').val().trim() || 'photo'));
  $('#imgQ').on('keydown', e => { if (e.key === 'Enter') $('#imgSearch').click(); });
  $('#imgGrid').on('click', 'img', async function () {
    const full = this.dataset.full, thumb = this.dataset.thumb, cr = JSON.parse(this.dataset.credit || 'null');
    $(this).css('opacity', .4);
    applyImg(await canLoad(full) ? full : (thumb || full), $('#imgQ').val().trim(), cr);
  });
  $('#imgUp').on('change', async function () {
    const f = this.files[0]; this.value = '';
    if (f) applyImg(await shrink(f));
  });

  // ---------- generate ----------
  async function generate(desc, ind) {
    const $go = $('#aiGo').prop('disabled', true);
    const t0 = Date.now(), busy = text => $go.html(`<span class="spinner-border spinner-border-sm"></span> ${text}`);
    $('#aiErr').text('');
    try {
      const useAI = await aiAvailable();
      // free models take about a minute, so show that something is happening
      busy('Writing your page…');
      const tick = setInterval(() => busy(`Writing your page… ${Math.round((Date.now() - t0) / 1000)} s`), 1000);
      let spec;
      try { spec = useAI ? await callAI(desc, ind) : demoSpec(desc, ind); }
      finally { clearInterval(tick); }
      const st = normalize(spec, desc, ind, useAI);
      busy('Finding photos…');
      await fillImages(st.sections);
      const prevTitle = state ? strip(state.title) : null;
      state = st;
      closeDesign();
      // fill the title unless the user typed one themselves (a title the previous AI page set may be replaced)
      const cur = $('#title').val().trim();
      if (!cur || $('#title').data('auto') || cur === prevTitle) $('#title').val(strip(state.title)).data('auto', true);
      paint(false);
      $('#aiModal').one('hidden.bs.modal', openThemes).modal('hide'); // then the 3 colour choices
      if (useAI && lastRun) toast(`✓ Made with ${lastRun.name} in ${Math.round(lastRun.ms / 1000)} s`);
    } catch (e) {
      $('#aiErr').text(e.message || String(e));
    } finally {
      $go.prop('disabled', false).html('<i class="fas fa-robot"></i> Generate');
    }
  }
  function toast(msg) {
    const $t = $('<div>').text(msg).css({ position: 'fixed', left: 16, bottom: 16, zIndex: 2000, background: '#1f2937', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontFamily: 'Poppins,sans-serif', boxShadow: '0 6px 18px rgba(0,0,0,.25)' }).appendTo('body');
    setTimeout(() => $t.fadeOut(400, () => $t.remove()), 7000);
  }
  async function openAI() {
    if (state) { $('#aiDesc').val(state.desc); if (INDUSTRIES[state.ind]) $('#aiCat').val(state.ind); }
    $('#aiErr').text('');
    $('#aiModal').modal('show');
    $('#aiNote').toggle(!(await aiAvailable()));
  }
  $('#aiGo').on('click', () => {
    const desc = $('#aiDesc').val().trim();
    if (!desc) return $('#aiErr').text('Please describe your page.');
    if (state && !isEmpty() && !confirm('Make a new page? Your current page will be replaced.')) return;
    generate(desc, $('#aiCat').val());
  });
  $('#title').on('input', function () { $(this).data('auto', false); });

  // older saved layouts used other field names; keep them working
  function upgrade(s) {
    if (!s || !Array.isArray(s.sections)) return null;
    s.ind = INDUSTRIES[s.ind] ? s.ind : (INDUSTRIES[s.cat] ? s.cat : 'Company profile');
    if (!Array.isArray(s.themes)) {
      const pals = Array.isArray(s.palettes) ? s.palettes : [];
      s.themes = (pals.length ? pals : BASE_THEMES.slice(0, 3)).map((p, k) => fixTheme({ font: s.font, ...p }, k));
      s.theme = s.pal || 0;
    }
    s.sections = s.sections.filter(x => R[x.type === 'coupon' ? 'offer' : x.type]).map(x => ({ radius: 'soft', bg: 'auto', ...x, type: x.type === 'coupon' ? 'offer' : x.type }));
    if (s.sections[0]?.type !== 'nav') s.sections.unshift(makeSection({ type: 'nav', design: 1, align: 'left' }, strip(s.title || ''), s.ind, false));
    const name = strip(s.title || '');
    for (const x of s.sections) {
      const d = DEF[x.type];
      for (const k in d) if (!(k in x.c)) x.c[k] = Array.isArray(d[k]) ? JSON.parse(JSON.stringify(d[k])) : esc(String(d[k]).replace('{name}', name));
      if (!FIXED.has(x.type) && !('menuLabel' in x.c)) x.c.menuLabel = esc(TYPEINFO[x.type].label || TYPEINFO[x.type].name);
      if (typeof x.menu !== 'boolean') x.menu = MENU_DEFAULT.has(x.type);
    }
    return s;
  }

  window.HTMLQR_AI = {
    button: c => c.ui.button({ className: 'btn-ai', contents: '<i class="fas fa-robot"></i> AI generation', tooltip: 'Make a landing page with AI', click: openAI }).render(),
    // called once the editor exists: attach on-page editing and restore the last AI layout
    restore() {
      if (!$area.length) mount();
      try { state = upgrade(JSON.parse(ls.get('htmlqr-ai-state'))); } catch (e) { state = null; }
      if (state && !/data-sec=/.test(getHTML())) state = null; // the restored draft is not an AI page
    },
    clear() { state = null; save(); closeDesign(); hideHover(); },
    snapshot: () => { syncFromEditor(); return state ? JSON.parse(JSON.stringify(state)) : null; },
    load(s) { state = upgrade(JSON.parse(JSON.stringify(s))); save(); closeDesign(); hideHover(); }
  };
})();
