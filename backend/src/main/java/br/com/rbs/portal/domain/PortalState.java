package br.com.rbs.portal.domain;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="portal_front_state") @Getter @Setter
public class PortalState {
 @Id private String id;
 @Lob @Column(nullable=false) private String json;
}
