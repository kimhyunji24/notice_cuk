package alli.notice_cuk.api.notice.entity;


import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    @Id
    private String id;
    private String siteId;
    private String postNo;
    private String link;
    private boolean isImportant;
    private LocalDateTime crawledAt;

}
