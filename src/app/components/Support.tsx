"use client";
import React, { useState } from "react";
import {
  HelpCircle,
  Globe,
  BookOpen,
  Video,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  Zap,
  Award,
} from "lucide-react";
import { mockFaqs, mockHelpResources } from "../data/support";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface SupportProps {
  faqs?: FAQItem[];
}

const Support: React.FC<SupportProps> = ({ faqs = [] }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const displayFaqs = faqs.length > 0 ? faqs : mockFaqs;

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const helpResources = [
    {
      icon: <BookOpen size={24} />,
      title: mockHelpResources[0].title,
      description: mockHelpResources[0].description,
      link: mockHelpResources[0].link,
    },
    {
      icon: <Video size={24} />,
      title: mockHelpResources[1].title,
      description: mockHelpResources[1].description,
      link: mockHelpResources[1].link,
    },
    {
      icon: <Users size={24} />,
      title: mockHelpResources[2].title,
      description: mockHelpResources[2].description,
      link: mockHelpResources[2].link,
    },
    {
      icon: <Globe size={24} />,
      title: mockHelpResources[3].title,
      description: mockHelpResources[3].description,
      link: mockHelpResources[3].link,
    },
  ];

  return (
    <div className="min-h-screen bg-mauve font-pixel p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div className="bg-periwinkle border-4 border-black p-6">
            <h2 className="text-2xl font-bold text-cream mb-6 flex items-center gap-2">
              <HelpCircle size={24} />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {displayFaqs.map((faq) => (
                <div key={faq.id} className="bg-cream border-2 border-black">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-4 text-left flex justify-between items-center hover:bg-mauve transition-colors"
                  >
                    <div>
                      <h3 className="font-bold text-plum text-sm">{faq.question}</h3>
                      <span className="text-xs text-blue-600 bg-mauve px-2 py-1 border border-blue-300">
                        {faq.category}
                      </span>
                    </div>
                    {expandedFaq === faq.id ? (
                      <ChevronUp size={16} className="text-blue-600" />
                    ) : (
                      <ChevronDown size={16} className="text-blue-600" />
                    )}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-4 pb-4">
                      <p className="text-blue-700 text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Help Resources */}
          <div className="bg-periwinkle border-4 border-black p-6">
            <h2 className="text-2xl font-bold text-cream mb-6 flex items-center gap-2">
              <BookOpen size={24} />
              Help Resources
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {helpResources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.link}
                  target={resource.link.startsWith('http') ? '_blank' : undefined}
                  rel={resource.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="bg-cream border-2 border-black p-4 hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600">
                      {resource.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-plum">{resource.title}</h3>
                      <p className="text-blue-700 text-sm">{resource.description}</p>
                    </div>
                    <ExternalLink size={16} className="text-blue-600" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="bg-periwinkle border-4 border-black p-6 mt-8">
          <h2 className="text-2xl font-bold text-cream mb-6 flex items-center gap-2">
            <Award size={24} />
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-cream border-2 border-black p-4 text-center">
              <div className="text-blue-600 mb-3 flex justify-center">
                <Shield size={32} />
              </div>
              <h3 className="font-bold text-plum mb-2">Secure Betting</h3>
              <p className="text-blue-700 text-sm">All transactions are secured by blockchain technology with transparent smart contracts.</p>
            </div>
            <div className="bg-cream border-2 border-black p-4 text-center">
              <div className="text-blue-600 mb-3 flex justify-center">
                <Zap size={32} />
              </div>
              <h3 className="font-bold text-plum mb-2">Instant Payouts</h3>
              <p className="text-blue-700 text-sm">Receive your winnings instantly when predictions are resolved.</p>
            </div>
            <div className="bg-cream border-2 border-black p-4 text-center">
              <div className="text-blue-600 mb-3 flex justify-center">
                <Users size={32} />
              </div>
              <h3 className="font-bold text-plum mb-2">Community Driven</h3>
              <p className="text-blue-700 text-sm">Join a community of traders and creators building the future of prediction markets.</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-periwinkle border-4 border-black p-6 mt-8">
          <h2 className="text-2xl font-bold text-cream mb-6 flex items-center gap-2">
            <HelpCircle size={24} />
            Quick Troubleshooting
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-cream border-2 border-black p-4">
              <h3 className="font-bold text-plum mb-2">Can&apos;t connect wallet?</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Make sure your wallet extension is installed</li>
                <li>• Try refreshing the page</li>
                <li>• Check if your wallet is unlocked</li>
                <li>• Ensure you&apos;re on the correct network</li>
              </ul>
            </div>
            <div className="bg-cream border-2 border-black p-4">
              <h3 className="font-bold text-plum mb-2">Transaction failed?</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Check your wallet has enough funds</li>
                <li>• Ensure sufficient gas fees</li>
                <li>• Try increasing gas limit</li>
                <li>• Wait for network congestion to clear</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
