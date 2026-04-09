import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const CATEGORIES = [
  { label: "Bug Report",       icon: "bug-outline" as const,         color: "#EF4444" },
  { label: "Feature Request",  icon: "bulb-outline" as const,        color: "#F59E0B" },
  { label: "General Feedback", icon: "chatbubble-outline" as const,  color: "#34FF7A" },
  { label: "Compliment",       icon: "heart-outline" as const,       color: "#EC4899" },
];

type Photo = { uri: string; base64?: string; mimeType?: string; fileName?: string };

export default function FeedbackModal({
  visible,
  onClose,
  userName,
  role,
}: {
  visible: boolean;
  onClose: () => void;
  userName: string;
  role: string;
}) {
  const [category, setCategory]   = useState("General Feedback");
  const [rating,   setRating]     = useState(0);
  const [message,  setMessage]    = useState("");
  const [photos,   setPhotos]     = useState<Photo[]>([]);
  const [sending,  setSending]    = useState(false);
  const [sent,     setSent]       = useState(false);

  function reset() {
    setCategory("General Feedback");
    setRating(0);
    setMessage("");
    setPhotos([]);
    setSending(false);
    setSent(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickPhoto() {
    if (photos.length >= 3) {
      Alert.alert("Photo Limit", "You can attach up to 3 photos per feedback.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        {
          uri:      asset.uri,
          base64:   asset.base64 ?? undefined,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? "feedback-photo.jpg",
        },
      ]);
      Haptics.selectionAsync();
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    Haptics.selectionAsync();
  }

  async function handleSend() {
    if (!message.trim()) {
      Alert.alert("Message Required", "Please write a message before sending your feedback.");
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const body = new FormData();
      body.append("userName",  userName || "Anonymous");
      body.append("role",      role     || "customer");
      body.append("category",  category);
      body.append("rating",    rating.toString());
      body.append("message",   message.trim());

      if (photos.length > 0 && Platform.OS !== "web") {
        for (const photo of photos) {
          body.append("photos", {
            uri:  photo.uri,
            name: photo.fileName ?? "photo.jpg",
            type: photo.mimeType ?? "image/jpeg",
          } as any);
        }
      } else if (photos.length > 0 && photos[0].base64) {
        body.append("photoBase64",    photos[0].base64);
        body.append("photoMimeType",  photos[0].mimeType ?? "image/jpeg");
        body.append("photoFileName",  photos[0].fileName ?? "photo.jpg");
      }

      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send feedback.");
      }

      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          {sent ? (
            /* ── Success state ── */
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color="#000" />
              </View>
              <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
                Thank you!
              </Text>
              <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
                Your feedback has been sent to the TheLawn team. We read every message and use it to make the app better.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ── Header ── */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>App Feedback</Text>
                  <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
                    We read every message — share anything
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#888" />
                </TouchableOpacity>
              </View>

              {/* ── Category ── */}
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      style={[
                        styles.catChip,
                        active && { backgroundColor: cat.color + "18", borderColor: cat.color },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setCategory(cat.label); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={15}
                        color={active ? cat.color : "#888"}
                      />
                      <Text
                        style={[
                          styles.catText,
                          { fontFamily: "Inter_500Medium" },
                          active && { color: cat.color },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Star Rating ── */}
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Rate your experience{" "}
                <Text style={{ color: "#555", fontSize: 12 }}>(optional)</Text>
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setRating(s === rating ? 0 : s); }}
                    activeOpacity={0.75}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={s <= rating ? "star" : "star-outline"}
                      size={32}
                      color={s <= rating ? "#F59E0B" : "#333"}
                    />
                  </TouchableOpacity>
                ))}
                {rating > 0 && (
                  <Text style={[styles.ratingLabel, { fontFamily: "Inter_500Medium" }]}>
                    {["","Poor","Fair","Good","Great","Excellent"][rating]}
                  </Text>
                )}
              </View>

              {/* ── Message ── */}
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Your message <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <View style={styles.chatBox}>
                <TextInput
                  style={[styles.chatInput, { fontFamily: "Inter_400Regular" }]}
                  placeholder="Tell us what's on your mind — bugs, ideas, praise, anything…"
                  placeholderTextColor="#444"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  maxLength={2000}
                />
                <View style={styles.chatFooter}>
                  <Text style={[styles.charCount, { fontFamily: "Inter_400Regular" }]}>
                    {message.length}/2000
                  </Text>
                </View>
              </View>

              {/* ── Photos ── */}
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Attach photos{" "}
                <Text style={{ color: "#555", fontSize: 12 }}>(up to 3, optional)</Text>
              </Text>
              <View style={styles.photoRow}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.photoThumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removePhoto(i)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 3 && (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={22} color="#555" />
                    <Text style={[styles.addPhotoText, { fontFamily: "Inter_400Regular" }]}>
                      Add photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Info note ── */}
              <View style={styles.infoNote}>
                <Ionicons name="mail-outline" size={13} color="#555" />
                <Text style={[styles.infoText, { fontFamily: "Inter_400Regular" }]}>
                  Feedback is sent directly to{" "}
                  <Text style={{ color: "#34FF7A" }}>TheLawnServices@gmail.com</Text>.
                  We aim to respond within 24–48 hours.
                </Text>
              </View>

              {/* ── Send button ── */}
              <TouchableOpacity
                style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                activeOpacity={message.trim() && !sending ? 0.85 : 1}
                disabled={!message.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#000" />
                    <Text style={[styles.sendBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                      Send Feedback
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: "#222",
    maxHeight: "92%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title:    { fontSize: 22, color: "#FFFFFF", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#888" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  label: { fontSize: 13, color: "#CCCCCC", marginBottom: 10 },

  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  catText: { fontSize: 12, color: "#888" },

  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
  },
  starBtn:     { padding: 4 },
  ratingLabel: { fontSize: 13, color: "#F59E0B", marginLeft: 8 },

  chatBox: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 18,
    marginBottom: 20,
    overflow: "hidden",
  },
  chatInput: {
    padding: 16,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 130,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderColor: "#1E1E1E",
  },
  charCount: { fontSize: 11, color: "#444" },

  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  photoThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: { width: "100%", height: "100%" },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: { fontSize: 10, color: "#555", textAlign: "center" },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { fontSize: 12, color: "#666", flex: 1, lineHeight: 17 },

  sendBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { fontSize: 16, color: "#000" },

  successWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 26, color: "#FFFFFF" },
  successSub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneBtnText: { fontSize: 16, color: "#000" },
});
