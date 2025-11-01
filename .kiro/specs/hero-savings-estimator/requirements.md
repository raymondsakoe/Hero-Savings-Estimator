# Requirements Document

## Introduction

The Hero Savings Estimator is a web application that calculates personalized mortgage savings for community heroes (first responders, healthcare workers, military, teachers, etc.) through the Keys for Community Heroes program. The system guides users through a multi-step form to collect their information and provides estimated savings based on their home purchase details.

## Glossary

- **Hero_Savings_System**: The complete web application that calculates and delivers mortgage savings estimates
- **Community_Hero**: A user who qualifies for the program (police, firefighter, nurse, military, teacher, skilled trade worker, etc.)
- **Hero_Credit**: A loan-based credit amount determined by loan amount tiers
- **Savings_Calculator**: The component that computes total estimated savings based on loan amount and program benefits
- **Lead_Management_System**: The GoHighLevel CRM integration that manages contact information and messaging
- **Multi_Step_Form**: The progressive form interface that collects user information across multiple screens
- **Notification_Service**: The service that generates and sends personalized email and SMS messages

## Requirements

### Requirement 1

**User Story:** As a community hero, I want to see if I qualify for mortgage savings, so that I can understand potential benefits before starting the home buying process

#### Acceptance Criteria

1. WHEN a Community_Hero visits the application, THE Hero_Savings_System SHALL display a welcome screen with program benefits
2. THE Hero_Savings_System SHALL provide role selection options for all supported hero categories
3. THE Hero_Savings_System SHALL allow navigation between form steps with back/next functionality
4. THE Hero_Savings_System SHALL display progress indication during the multi-step process
5. THE Hero_Savings_System SHALL complete the estimation process within 60 seconds

### Requirement 2

**User Story:** As a community hero, I want to input my home purchase details, so that I can receive accurate savings calculations

#### Acceptance Criteria

1. THE Hero_Savings_System SHALL collect the Community_Hero's role selection from predefined categories
2. THE Hero_Savings_System SHALL accept home price input with quick selection options and custom entry
3. THE Hero_Savings_System SHALL accept down payment percentage with predefined options (3%, 5%, 10%, 20%)
4. THE Hero_Savings_System SHALL validate all required form inputs before proceeding
5. THE Hero_Savings_System SHALL calculate loan amount as home price minus down payment amount

### Requirement 3

**User Story:** As a community hero, I want to see my estimated savings breakdown, so that I can understand the financial benefits available to me

#### Acceptance Criteria

1. THE Savings_Calculator SHALL determine Hero_Credit based on loan amount tiers ($500-$3000 range)
2. THE Savings_Calculator SHALL include guaranteed partner savings of $850
3. THE Savings_Calculator SHALL include potential bonus savings between $250-$550
4. THE Hero_Savings_System SHALL display minimum and maximum total savings estimates
5. THE Hero_Savings_System SHALL present savings breakdown in a clear, formatted display

### Requirement 4

**User Story:** As a community hero, I want to receive my savings report via email and SMS, so that I can reference it later and share with family

#### Acceptance Criteria

1. THE Hero_Savings_System SHALL collect Community_Hero contact information (name, email, phone)
2. THE Hero_Savings_System SHALL validate email format and phone number format
3. THE Notification_Service SHALL generate personalized email content with complete savings breakdown
4. WHERE the Community_Hero opts for SMS, THE Notification_Service SHALL generate concise SMS content
5. THE Hero_Savings_System SHALL deliver notifications within 30 seconds of form submission

### Requirement 5

**User Story:** As a community hero, I want my information to be securely handled and integrated with the lender's system, so that I can be contacted by qualified loan officers

#### Acceptance Criteria

1. THE Lead_Management_System SHALL create or update contact records in GoHighLevel CRM
2. THE Lead_Management_System SHALL handle duplicate contact detection by email and phone
3. THE Lead_Management_System SHALL apply appropriate tags for lead tracking
4. THE Hero_Savings_System SHALL implement bot protection with honeypot fields and timing validation
5. THE Hero_Savings_System SHALL sanitize all user input to prevent security vulnerabilities

### Requirement 6

**User Story:** As a community hero, I want to easily schedule a consultation call, so that I can discuss my options with a loan specialist

#### Acceptance Criteria

1. THE Hero_Savings_System SHALL provide direct link to Calendly scheduling system
2. THE Hero_Savings_System SHALL include scheduling links in all notification messages
3. THE Hero_Savings_System SHALL display testimonials from other community heroes
4. THE Hero_Savings_System SHALL provide social sharing functionality for savings results
5. THE Hero_Savings_System SHALL maintain responsive design across all device types
