import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description }) => {
  useEffect(() => {
    const defaultTitle = 'BioQR - Biometric + QR Security System';
    const newTitle = title ? `${title} | BioQR` : defaultTitle;
    
    // Update Document Title
    document.title = newTitle;

    // Update Open Graph and Twitter Titles
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', newTitle);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', newTitle);

    // Update Meta Description if provided
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', description);
    }

    // Cleanup when component unmounts (optional, typically we just overwrite on next page load)
    return () => {
      document.title = defaultTitle;
    };
  }, [title, description]);

  return null; // This component handles DOM manipulation side-effects only
};

export default SEO;
