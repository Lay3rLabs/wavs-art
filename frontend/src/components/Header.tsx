import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useLocation } from "react-router-dom";

const Header: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full py-4 md:py-6 px-3 md:px-8 flex justify-between items-center relative border-b border-dark-700 backdrop-blur-sm z-40">
      {/* Animated header underline */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyber-gradient"></div>

      {/* Network/blockchain decor */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-dark-600 -z-10"></div>
      <div className="absolute top-0 left-1/4 bottom-0 w-px bg-dark-600 -z-10"></div>
      <div className="absolute top-0 left-3/4 bottom-0 w-px bg-dark-600 -z-10"></div>

      <div className="flex items-center">
        <div className="h-7 w-7 md:h-8 md:w-8 mr-2 md:mr-3 relative">
          <div className="absolute inset-0 border-2 border-primary animate-pulse"></div>
          <div className="absolute inset-[3px] border border-primary/60"></div>
          <div className="absolute inset-0 flex items-center justify-center text-primary font-mono text-xs">
            W
          </div>
        </div>
        <h1 className="text-lg md:text-2xl font-bold font-glitch text-white relative group">
          <span className="crt-flicker">W</span>
          <span className="">A</span>
          <span className="crt-flicker">V</span>
          <span className="">S::</span>
          <span className="text-primary ml-1 md:ml-2">ART</span>
          <span className="bg-dark-800 text-secondary px-1 md:px-2 ml-1 md:ml-2 text-xs md:text-sm">
            v1.0
          </span>

          {/* Top secret hover effect */}
          <span
            className="absolute -top-1 -right-1 bg-danger text-black text-[8px] px-1 rotate-12
                         opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Demo
          </span>
        </h1>
      </div>

      {/* Navigation buttons - desktop */}
      <div className="hidden md:flex items-center space-x-4">
        <Link
          to="/"
          className={`text-sm font-mono text-white hover:text-primary transition-colors ${
            location.pathname === "/" ? "border-b-2 border-primary" : ""
          }`}
        >
          HOME
        </Link>
        <Link
          to="/rewards"
          className={`text-sm font-mono text-white hover:text-primary transition-colors ${
            location.pathname === "/rewards" ? "border-b-2 border-primary" : ""
          }`}
        >
          REWARDS
        </Link>
      </div>

      {/* Custom ConnectButton wrapper */}
      <div className="relative">
        <div className="absolute -inset-[1px] bg-cyber-gradient opacity-50 blur-[1px] -z-10"></div>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="bg-dark-800 text-primary border border-primary px-2 sm:px-4 py-1 sm:py-2
                                  font-mono text-xs sm:text-sm uppercase tracking-wider
                                  hover:bg-primary/10 hover:shadow-[0_0_8px_0] hover:shadow-primary/50
                                  transition-all duration-300"
                      >
                        <div className="flex items-center">
                          <span className="mr-1 sm:mr-2">CONNECT</span>
                          <svg
                            className="h-2 w-2 sm:h-3 sm:w-3 text-primary"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M12.982 11.753a.5.5 0 00-.5-.5h-7.5a.5.5 0 00-.5.5v1.5a.5.5 0 00.5.5h7.5a.5.5 0 00.5-.5v-1.5zM4.982 6.753a.5.5 0 01.5-.5h7.5a.5.5 0 01.5.5v1.5a.5.5 0 01-.5.5h-7.5a.5.5 0 01-.5-.5v-1.5zM12.982 1.753a.5.5 0 00-.5-.5h-7.5a.5.5 0 00-.5.5v1.5a.5.5 0 00.5.5h7.5a.5.5 0 00.5-.5v-1.5z" />
                          </svg>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center">
                      {/* Mobile view - show only account button */}
                      <button
                        onClick={openAccountModal}
                        className="flex md:hidden items-center bg-dark-800 text-xs border border-primary
                                  px-2 py-1 font-mono text-primary hover:bg-primary/10 transition truncate max-w-[120px]"
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mr-1"></span>
                        {account.displayName}
                      </button>
                      
                      {/* Desktop view - show both chain and account buttons */}
                      <div className="hidden md:flex">
                        <button
                          onClick={openChainModal}
                          className="flex items-center bg-dark-800 text-sm border border-r-0 border-accent
                                    px-3 py-2 font-mono text-accent hover:bg-accent/10 transition"
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              className="h-4 w-4 mr-2"
                            />
                          )}
                          {chain.name?.toUpperCase()}
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="flex items-center bg-dark-800 text-sm border border-primary
                                    px-3 py-2 font-mono text-primary hover:bg-primary/10 transition"
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></span>
                          {account.displayName}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
      
      {/* Mobile menu button */}
      <button 
        className="md:hidden ml-2 text-primary"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-dark-800 border-b border-dark-700 p-4 md:hidden z-50 shadow-lg">
          <Link
            to="/"
            className={`block py-2 text-sm font-mono text-white hover:text-primary transition-colors ${
              location.pathname === "/" ? "text-primary" : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            HOME
          </Link>
          <Link
            to="/rewards"
            className={`block py-2 text-sm font-mono text-white hover:text-primary transition-colors ${
              location.pathname === "/rewards" ? "text-primary" : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            REWARDS
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
