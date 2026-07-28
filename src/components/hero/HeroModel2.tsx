import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { Link } from "react-router-dom";
import { Campaign } from "@/hooks/useData";

interface HeroModel2Props {
  campaigns: Campaign[];
  delay?: number;
  transitionType?: 'slide' | 'fade';
}

const pickHeroImage = (campaign: Campaign): string => {
  const hero = (campaign as any).hero_image_url as string | null | undefined;
  if (hero && hero.trim() !== "") return hero;
  if (campaign.image_url && campaign.image_url.trim() !== "") return campaign.image_url;
  const first = campaign.gallery_urls?.[0];
  return first || "/placeholder.svg";
};

const HeroModel2 = ({ campaigns, delay = 6000, transitionType = 'slide' }: HeroModel2Props) => {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, duration: 50 }, 
    transitionType === 'fade' ? [Autoplay({ delay }), Fade()] : [Autoplay({ delay })]
  );

  return (
    <section className="relative w-full bg-zinc-950 overflow-hidden" ref={emblaRef}>
      <div className="flex w-full">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            to={`/campanha/${campaign.slug || campaign.id}`}
            className="relative min-w-full flex-[0_0_100%] block"
            aria-label={campaign.title}
          >
            <img
              src={pickHeroImage(campaign)}
              alt={campaign.title}
              className="block w-full h-auto object-contain"
              loading="eager"
            />
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HeroModel2;