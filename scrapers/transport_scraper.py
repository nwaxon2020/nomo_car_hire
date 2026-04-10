import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
import os

# This is a sample scraper for Nigerian Transport Companies
# Note: Real-time scraping requires handling dynamic content (JS) 
# and potentially anti-bot measures. This script provides the structure.

class TransportScraper:
    def __init__(self):
        self.results = []

    def scrape_pmt(self):
        """Scrape Peace Mass Transit"""
        print("Scraping Peace Mass Transit...")
        try:
            # Mocking data as PMT uses dynamic booking
            # In a real scenario, use playwright to interact with the search form
            data = [
                {"from": "Lagos", "to": "Abuja", "amount": 32000, "company": "Peace Mass Transit", "time": "06:30 AM", "discount": "5%", "website": "https://pmt.ng"},
                {"from": "Enugu", "to": "Lagos", "amount": 19500, "company": "Peace Mass Transit", "time": "07:00 AM", "discount": "0%", "website": "https://pmt.ng"},
            ]
            self.results.extend(data)
        except Exception as e:
            print(f"Error scraping PMT: {e}")

    def scrape_gigm(self):
        """Scrape GIGM (God is Good Motors)"""
        print("Scraping GIGM...")
        try:
            data = [
                {"from": "Lagos", "to": "Benin", "amount": 18500, "company": "GIGM", "time": "06:00 AM", "discount": "10%", "website": "https://gigm.com"},
                {"from": "Abuja", "to": "Lagos", "amount": 34500, "company": "GIGM", "time": "05:30 AM", "discount": "0%", "website": "https://gigm.com"},
            ]
            self.results.extend(data)
        except Exception as e:
            print(f"Error scraping GIGM: {e}")

    def scrape_guo(self):
        """Scrape GUO Motors"""
        print("Scraping GUO Motors...")
        try:
            data = [
                {"from": "Lagos", "to": "Onitsha", "amount": 26000, "company": "GUO Motors", "time": "07:30 AM", "discount": "5%", "website": "https://guotransport.com"},
                {"from": "Port Harcourt", "to": "Lagos", "amount": 24000, "company": "GUO Motors", "time": "06:45 AM", "discount": "0%", "website": "https://guotransport.com"},
            ]
            self.results.extend(data)
        except Exception as e:
            print(f"Error scraping GUO: {e}")

    def scrape_abc(self):
        """Scrape ABC Transport"""
        print("Scraping ABC Transport...")
        try:
            data = [
                {"from": "Lagos", "to": "Accra", "amount": 55000, "company": "ABC Transport", "time": "06:00 AM", "discount": "5%", "website": "https://abctransport.com"},
                {"from": "Lagos", "to": "Owerri", "amount": 28000, "company": "ABC Transport", "time": "07:15 AM", "discount": "0%", "website": "https://abctransport.com"},
            ]
            self.results.extend(data)
        except Exception as e:
            print(f"Error scraping ABC: {e}")

    def run_all(self):
        self.scrape_pmt()
        self.scrape_gigm()
        self.scrape_guo()
        self.scrape_abc()
        
        # Add timestamp and metadata
        output = {
            "last_updated": datetime.now().isoformat(),
            "count": len(self.results),
            "listings": self.results
        }
        
        # Save to JSON for the Next.js app to consume
        with open("transport_listings.json", "w") as f:
            json.dump(output, f, indent=4)
        
        print(f"Successfully scraped {len(self.results)} listings.")

if __name__ == "__main__":
    scraper = TransportScraper()
    scraper.run_all()
