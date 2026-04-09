import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DocType = "terms" | "privacy";

interface Props {
  visible: boolean;
  docType: DocType;
  onClose: () => void;
}

const TERMS_CONTENT = `Last updated: April 7, 2026

PLEASE READ THESE TERMS CAREFULLY BEFORE USING THELAWN APP.

1. ACCEPTANCE OF TERMS
By creating an account or using TheLawn, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use this app.

2. THELAWN IS A MARKETPLACE PLATFORM
TheLawn is a technology platform that connects customers seeking landscaping services with independent service providers ("Landscapers"). TheLawn is NOT a landscaping company and does NOT perform any landscaping services. All services are provided solely by independent Landscapers.

3. INDEPENDENT CONTRACTORS
All Landscapers on TheLawn are independent contractors, not employees, agents, or representatives of TheLawn. TheLawn does not control the manner, means, or quality of any services performed.

4. ELIGIBILITY
You must be at least 18 years old to use this app. By registering, you confirm that you are 18 or older and that all information you provide is accurate and truthful.

5. BACKGROUND CHECKS & VERIFICATION
TheLawn may perform or require background checks on Landscapers, but does NOT guarantee that all Landscapers have been fully vetted. Users are encouraged to review ratings and reviews before booking and to use their own judgment when granting access to their property.

6. PROPERTY ACCESS & LIABILITY
When you book a service, you are granting the Landscaper permission to access your property. TheLawn is NOT responsible or liable for any damage to property, injury, theft, or other incidents that occur during or as a result of a service. Any disputes regarding property damage must be resolved directly between the customer and the Landscaper.

7. PAYMENTS & COMMISSION FEES
Payments are processed through the app. By adding a payment method, you authorize TheLawn to charge you for services booked. All pricing is set by individual Landscapers and is subject to change. Tips are voluntary.

TheLawn collects a platform commission fee on each completed booking. All commission fees collected by TheLawn are remitted to TheLawn's business PayPal account at thelawnservice@gmail.com. Landscapers receive the agreed service amount minus the applicable platform commission. Commission rates are displayed at the time of booking confirmation.

8. CANCELLATION POLICY
Cancellations made more than 24 hours before a scheduled appointment are free of charge. Cancellations within 24 hours of the appointment may incur a cancellation fee set by the Landscaper. No-shows may be charged the full service price.

9. RATINGS & REVIEWS
Both customers and Landscapers may leave reviews. Reviews must be honest and based on actual experiences. TheLawn reserves the right to remove reviews that violate our community guidelines.

10. PROHIBITED CONDUCT
You agree NOT to:
• Use the app for any unlawful purpose
• Harass, threaten, or discriminate against any user
• Provide false information when registering
• Attempt to circumvent the app to avoid paying service fees
• Share your account credentials with others

11. LIMITATION OF LIABILITY
TO THE FULLEST EXTENT PERMITTED BY LAW, THELAWN AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP OR ANY SERVICES BOOKED THROUGH IT.

12. DISPUTE RESOLUTION
Any disputes arising out of or related to these Terms will be resolved through binding arbitration, except where prohibited by law. You waive the right to participate in a class-action lawsuit.

13. CHANGES TO TERMS
TheLawn may update these Terms at any time. Continued use of the app after changes constitutes acceptance of the new Terms.

14. CONTACT
For questions about these Terms, email us at TheLawnServices@gmail.com.`;

const PRIVACY_CONTENT = `Last updated: April 7, 2026

YOUR PRIVACY MATTERS TO US. THIS POLICY EXPLAINS WHAT WE COLLECT AND HOW WE USE IT.

1. INFORMATION WE COLLECT

Account Information: When you register, we collect your name, email address, phone number, and address (customers) or business name and service area (Landscapers).

Location Data: With your permission, we collect location data to match you with nearby Landscapers or to display available jobs.

Payment Information: Payment details are processed through our payment partners. TheLawn does not store full card numbers.

Photos & Media: If you upload photos to service requests, we store those images securely.

Usage Data: We collect information about how you use the app, including pages visited, features used, and time spent.

2. HOW WE USE YOUR INFORMATION
• To create and manage your account
• To connect customers with Landscapers in their area
• To process payments and send receipts
• To send appointment reminders and notifications
• To improve and personalize the app experience
• To detect fraud and ensure platform safety

3. INFORMATION SHARING
We do NOT sell your personal information to third parties.

We share information with:
• Landscapers you book (name, address, phone — only after booking is confirmed)
• Customers whose jobs you accept (business name, phone — only after acceptance)
• Payment processors to handle transactions
• Service providers who help us operate the app (subject to confidentiality agreements)
• Law enforcement when required by law

4. DATA SECURITY
We use industry-standard encryption and security practices to protect your data. However, no digital transmission or storage system is 100% secure.

5. YOUR RIGHTS
You may:
• Access or update your personal information in your Profile
• Request deletion of your account and data by contacting support
• Opt out of marketing communications at any time

6. PUSH NOTIFICATIONS
We may send push notifications for appointment reminders, new offers, and updates. You can disable notifications in your device settings at any time.

7. CHILDREN'S PRIVACY
TheLawn is intended for users 18 years and older. We do not knowingly collect information from anyone under 18.

8. DATA RETENTION
We retain your data for as long as your account is active or as needed to provide services. Deleted accounts are purged within 30 days.

9. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email.

10. CONTACT
For privacy questions or data requests, email us at TheLawnServices@gmail.com.`;

export default function TermsModal({ visible, docType, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const title = docType === "terms" ? "Terms of Service" : "Privacy Policy";
  const content = docType === "terms" ? TERMS_CONTENT : PRIVACY_CONTENT;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: isWeb ? 20 : insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: isWeb ? 40 : insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.body, { fontFamily: "Inter_400Regular" }]}>{content}</Text>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: isWeb ? 20 : insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={[styles.closeFooterText, { fontFamily: "Inter_600SemiBold" }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  title: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  body: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
  },
  closeFooterBtn: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  closeFooterText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
});
