self.addEventListener("push", function (event) {
  let data = { title: "CardFlow Reminder", body: "You have a card due soon." };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    // fall back to default text above
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
