-- Home page slider, editable from Admin -> Home Slider.
CREATE TABLE "HomeSlide" (
  "id" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "linkUrl" TEXT NOT NULL DEFAULT '',
  "pill" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL DEFAULT '',
  "cta" TEXT NOT NULL DEFAULT '',
  "translations" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomeSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeSlide_isActive_sortOrder_idx" ON "HomeSlide"("isActive", "sortOrder");

-- The five banners the home page shipped with, so the slider looks the same
-- after this migration. Their images are already in the web app's
-- /public/home-slider folder.
INSERT INTO "HomeSlide" ("id", "imageUrl", "mobileImageUrl", "linkUrl", "pill", "title", "subtitle", "cta", "translations", "sortOrder", "updatedAt") VALUES
(
  'homeslide_temple_dawn', '/home-slider/temple-dawn-1920.webp', '/home-slider/temple-dawn-m1200.webp', '/teerth-puja',
  'Teerth Puja', 'Puja at India’s holiest temples, in your name',
  'Verified pandits perform your sankalp at sacred teerths, and you receive the full puja video.', 'Explore Teerth Pujas',
  '{
    "hi": {"pill": "तीर्थ पूजा", "title": "भारत के पवित्रतम मंदिरों में, आपके नाम से पूजा", "subtitle": "सत्यापित पंडित पवित्र तीर्थों पर आपका संकल्प करते हैं, और आपको पूजा का पूरा वीडियो मिलता है।", "cta": "तीर्थ पूजाएँ देखें"},
    "fr": {"pill": "Puja Teerth", "title": "Une puja dans les temples les plus sacrés de l’Inde, en votre nom", "subtitle": "Des pandits vérifiés accomplissent votre sankalp dans les teerths sacrés, et vous recevez la vidéo complète de la puja.", "cta": "Découvrir les pujas Teerth"},
    "es": {"pill": "Puja Teerth", "title": "Puja en los templos más sagrados de la India, en tu nombre", "subtitle": "Pandits verificados realizan tu sankalp en teerths sagrados y recibes el video completo de la puja.", "cta": "Explorar pujas Teerth"}
  }', 1, CURRENT_TIMESTAMP
),
(
  'homeslide_home_mandir', '/home-slider/home-mandir-1920.webp', '/home-slider/home-mandir-m1200.webp', '/puja',
  'Puja at Home', 'A Vedic pandit at your home mandir',
  'Book Griha Pravesh, Satyanarayan and more. Pandit, samagri and setup are all taken care of.', 'Book a Home Puja',
  '{
    "hi": {"pill": "घर पर पूजा", "title": "आपके घर के मंदिर में वैदिक पंडित", "subtitle": "गृह प्रवेश, सत्यनारायण कथा और भी बहुत कुछ बुक करें। पंडित, सामग्री और व्यवस्था, सब हमारी ओर से।", "cta": "घर पर पूजा बुक करें"},
    "fr": {"pill": "Puja à domicile", "title": "Un pandit védique dans le mandir de votre maison", "subtitle": "Réservez Griha Pravesh, Satyanarayan et plus encore. Pandit, samagri et installation sont pris en charge.", "cta": "Réserver une puja à domicile"},
    "es": {"pill": "Puja en casa", "title": "Un pandit védico en el mandir de tu hogar", "subtitle": "Reserva Griha Pravesh, Satyanarayan y más. Nos encargamos del pandit, el samagri y la preparación.", "cta": "Reservar puja en casa"}
  }', 2, CURRENT_TIMESTAMP
),
(
  'homeslide_live_puja', '/home-slider/live-puja-1920.webp', '/home-slider/live-puja-m1200.webp', '/live-darshan',
  'Live Darshan', 'Join a live puja from anywhere in the world',
  'Watch your puja live with your family and take part in the sankalp in real time.', 'See Live Darshan',
  '{
    "hi": {"pill": "लाइव दर्शन", "title": "दुनिया में कहीं से भी लाइव पूजा में जुड़ें", "subtitle": "अपने परिवार के साथ पूजा लाइव देखें और संकल्प में सीधे सहभागी बनें।", "cta": "लाइव दर्शन देखें"},
    "fr": {"pill": "Darshan en direct", "title": "Participez à une puja en direct, où que vous soyez", "subtitle": "Suivez votre puja en direct avec votre famille et prenez part au sankalp en temps réel.", "cta": "Voir le Darshan en direct"},
    "es": {"pill": "Darshan en vivo", "title": "Únete a una puja en vivo desde cualquier lugar del mundo", "subtitle": "Mira tu puja en vivo con tu familia y participa en el sankalp en tiempo real.", "cta": "Ver Darshan en vivo"}
  }', 3, CURRENT_TIMESTAMP
),
(
  'homeslide_havan', '/home-slider/havan-1920.webp', '/home-slider/havan-m1200.webp', '/puja',
  'Havan & Homam', 'Sacred havans for peace, health and prosperity',
  'Navagraha, Rudrabhishek, Maha Mrityunjaya and more, performed by learned Vedic pandits.', 'Browse Pujas',
  '{
    "hi": {"pill": "हवन और होम", "title": "शांति, स्वास्थ्य और समृद्धि के लिए पवित्र हवन", "subtitle": "नवग्रह, रुद्राभिषेक, महामृत्युंजय और अन्य अनुष्ठान, विद्वान वैदिक पंडितों द्वारा।", "cta": "पूजाएँ देखें"},
    "fr": {"pill": "Havan et Homam", "title": "Des havans sacrés pour la paix, la santé et la prospérité", "subtitle": "Navagraha, Rudrabhishek, Maha Mrityunjaya et plus encore, accomplis par des pandits védiques érudits.", "cta": "Parcourir les pujas"},
    "es": {"pill": "Havan y Homam", "title": "Havans sagrados para la paz, la salud y la prosperidad", "subtitle": "Navagraha, Rudrabhishek, Maha Mrityunjaya y más, realizados por pandits védicos eruditos.", "cta": "Ver pujas"}
  }', 4, CURRENT_TIMESTAMP
),
(
  'homeslide_puja_thali', '/home-slider/puja-thali-1920.webp', '/home-slider/puja-thali-m1200.webp', '/products',
  'Puja Samagri', 'Complete puja samagri, delivered to your door',
  'Thalis, brass diyas and pure, authentic puja essentials for every ritual.', 'Shop Samagri',
  '{
    "hi": {"pill": "पूजा सामग्री", "title": "संपूर्ण पूजा सामग्री, आपके द्वार तक", "subtitle": "हर अनुष्ठान के लिए थाली, पीतल के दीये और शुद्ध, प्रामाणिक पूजा सामग्री।", "cta": "सामग्री खरीदें"},
    "fr": {"pill": "Samagri de puja", "title": "Tout le samagri de puja, livré chez vous", "subtitle": "Thalis, diyas en laiton et articles de puja purs et authentiques pour chaque rituel.", "cta": "Acheter le samagri"},
    "es": {"pill": "Samagri de puja", "title": "Samagri de puja completo, entregado en tu puerta", "subtitle": "Thalis, diyas de latón y artículos de puja puros y auténticos para cada ritual.", "cta": "Comprar samagri"}
  }', 5, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
