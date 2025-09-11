package alli.notice_cuk.api.subscription.entity;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Document(collection = "subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    private String fcmToken;
    private Set<String> sites = new HashSet<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
