-- Per-puja feature bullets. Existing and new pujas start from the four
-- standard lines the puja page used to hardcode.
ALTER TABLE "Puja" ADD COLUMN "features" TEXT[] DEFAULT ARRAY['Verified pandit trained in scriptural procedures', 'Organic, premium samagri elements organized beforehand', 'Rigorous rituals scheduled on correct shastric muhurats', 'Recorded video updates and prasad delivery included']::TEXT[];
ALTER TABLE "Puja" ADD COLUMN "featuresHi" TEXT[] DEFAULT ARRAY['शास्त्रीय विधि में प्रशिक्षित सत्यापित पंडित', 'जैविक, उत्तम पूजा सामग्री पहले से व्यवस्थित', 'शुद्ध शास्त्रीय मुहूर्त पर विधिवत अनुष्ठान', 'पूजा का वीडियो और प्रसाद वितरण शामिल']::TEXT[];
