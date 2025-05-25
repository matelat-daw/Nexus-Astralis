import { Component } from '@angular/core';

// Imports gsap
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SplitText } from 'gsap/SplitText';
import { RouterLink } from '@angular/router';
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText);

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor() { }

  ngAfterViewInit() {
    this.initAnimations();
  }

  initAnimations() {
    // Main title animation
    let mainTitleSplit = SplitText.create(".titleBanner", { 
      type: "chars",
      charsClass: "char",
    });

    // Subtitle animation
    let subtitleSplit = SplitText.create(".subtitleBanner", { 
      type: "chars",
      charsClass: "char",
    });

    // Banner animations timeline
    const bannerTl = gsap.timeline();
    
    // Main title animation
    bannerTl.from(mainTitleSplit.chars, {
      y: 50,
      autoAlpha: 0,
      stagger: 0.05,
      duration: 0.8,
      ease: "back.out(1.7)"
    });
    
    // Subtitle animation
    bannerTl.to(".subtitleBanner", { autoAlpha: 1, duration: 0.5 }, "-=0.3")
      .from(subtitleSplit.chars, {
        y: 20,
        autoAlpha: 0,
        stagger: 0.03,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.4");

    // Pin the banner while scrolling
    const pinTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.info',
        start: 'top 100%',
        end: 'top 0%',
        scrub: 1,
        pin: ".banner",
        pinSpacing: true,
        anticipatePin: 10,
        toggleActions: 'restart none none reverse'
      }
    });

    // Animate sections as they come into view
    gsap.utils.toArray('.art1').forEach((section: any, i) => {
      const sectionTl = gsap.timeline({
        scrollTrigger: {
          trigger: section as Element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      });
      
      sectionTl.to(section, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      });
      
      // Add additional animations for specific sections
      if (i === 1) { // Features section (second article)
        sectionTl.from('.feature-item', {
          y: 20,
          opacity: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: "power1.out"
        }, "-=0.4");
      }
      
      if (i === 3) { // CTA section (last article)
        sectionTl.from('.cta-button', {
          scale: 0.9,
          opacity: 0,
          stagger: 0.2,
          duration: 0.6,
          ease: "back.out(1.7)"
        }, "-=0.3");
      }
    });
    
    // Animate icon containers
    gsap.from('.icon-container', {
      scrollTrigger: {
        trigger: '.info',
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      },
      scale: 0,
      rotation: -180,
      opacity: 0,
      stagger: 0.2,
      duration: 0.8,
      ease: "back.out(1.7)"
    });
  }
}