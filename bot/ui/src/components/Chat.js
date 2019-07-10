import React from "react";
import {Form, Col, Modal, Alert} from "react-bootstrap";
import {Link} from "react-router-dom";
import {websocketUrl} from "../utils.js";
import Websocket from "react-websocket";
import * as utils from "../utils.js";
import {Api} from "../api.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const OBS_CSS = [
  "body.chat-body {",
  "  font-size: 120%;",
  "  background-color: rgba(0, 0, 0, 0);",
  "}",
  ".chat-message {",
  "  background-color: rgba(0, 0, 0, 0) !important;",
  "  text-shadow:",
  "    -2px -2px 0 #000,",
  "     0   -2px 0 #000,",
  "     2px -2px 0 #000,",
  "     2px  0   0 #000,",
  "     2px  2px 0 #000,",
  "     0    2px 0 #000,",
  "    -2px  2px 0 #000,",
  "    -2px  0   0 #000;",
  "}",
  ".overlay-hidden { display: none; }"
];

function isASCII(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

/**
 * Convert and limit the number of messages.
 *
 * @param {Array} messages array of messages
 * @param {number | null} limit limit for the number of messages
 */
function filterMessages(messages, limit, ids) {
  if (limit === null) {
    return {ids, messages};
  }

  let len = messages.length;

  if (len < limit) {
    return {ids, messages};
  }

  for (var m of messages.slice(0, len - limit)) {
    delete ids[m.id];
  }

  messages = messages.slice(len - limit, len);
  return {ids, messages};
}

/**
 * Filter unique messages.
 */
function filterUnique(messages) {
  let seen = {};
  let out = []
  let ids = {};

  for (let m of messages) {
    if (seen[m.user.name]) {
      continue;
    }

    seen[m.user.name] = true;
    ids[m.id] = true;
    out.push(m);
  }

  return {seen, ids, messages: out};
}

function searchLimit(search) {
  let update = search.get("limit");

  if (!update) {
    return {limit: null, limitText: ""};
  }

  update = parseInt(update);

  if (!isFinite(update)) {
    return {limit: null, limitText: ""};
  }

  return {limit: update, limitText: update.toString()};
}

function searchBoolean(search, key, def = false) {
  let update = search.get(key);

  if (update === null) {
    return def;
  }

  switch (update) {
    case "true":
      return true;
    default:
      return false;
  }
}

function searchInactivity(search) {
  let update = search.get("inactivity");

  if (!update) {
    return {inactivity: null, inactivityText: ""};
  }

  update = parseInt(update);

  if (!isFinite(update)) {
    return {inactivity: null, inactivityText: ""};
  }

  return {inactivity: update, inactivityText: update.toString()};
}

/**
 * Computer the collection of seen users from the given set of messages.
 */
function computeSeen(messages) {
  let seen = {};

  for (let m of messages) {
    seen[m.user.name] = true;
  }

  return seen;
}

export default class Chat extends React.Component {
  constructor(props) {
    super(props);

    this.api = new Api(utils.apiUrl());
    this.bottomRef = React.createRef();
    this.inactivityTimeout = null;
    this.cachedEmotes = {};

    let search = new URLSearchParams(this.props.location.search);
    let {limit, limitText} = searchLimit(search);
    let unique = searchBoolean(search, "unique");
    let showDeleted = searchBoolean(search, "show-deleted");
    let highResEmotes = searchBoolean(search, "high-res-emotes");
    let {inactivity, inactivityText} = searchInactivity(search);

    this.state = {
      messages: [],
      limit,
      limitText,
      unique,
      showDeleted,
      highResEmotes,
      inactivity,
      inactivityText,
      seen: {},
      ids: {},
      edit: false,
      changed: false,
      visible: true,
      enabled: true,
    };
  }

  scrollToChat() {
    /* don't scroll if we are editing */
    if (this.state.edit) {
      return;
    }

    this.bottomRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  componentDidMount() {
    this.reloadChatMessages();
    this.bumpInactivity();
  }

  componentWillMount() {
    document.body.classList.add('chat-body');
  }

  componentWillUnmount() {
    document.body.classList.remove('chat-body');
  }

  /**
   * Reload chat messages.
   */
  reloadChatMessages() {
    this.api.chatMessages().then(messages => {
      if (!this.state.showDeleted) {
        messages = messages.filter(m => !m.deleted);
      }

      let update = filterMessages(messages, this.state.limit, this.state.ids);

      if (this.state.unique) {
        update = filterUnique(update.messages);
      }

      this.setState(update);
    });
  }

  /**
   * Set the inactivity timeout.
   */
  bumpInactivity() {
    if (this.state.inactivity === null) {
      if (!this.state.visible) {
        this.setState({visible: true});
      }

      return;
    }

    this.setState({visible: true});

    if (this.inactivityTimeout !== null) {
      clearTimeout(this.inactivityTimeout);
    }

    this.inactivityTimeout = setTimeout(() => {
      this.inactivityTimeout = null;
      this.setState({visible: false});
    }, this.state.inactivity * 1000);
  }

  handleData(d) {
    let data = null;

    try {
      data = JSON.parse(d);
    } catch(e) {
      console.log("failed to deserialize message");
      return;
    }

    switch (data.type) {
      case "message":
        if (this.state.unique && !!this.state.seen[data.user.name]) {
          return;
        }

        if (!!this.state.ids[data.id]) {
          return;
        }

        this.setState(s => {
          let messages = s.messages.slice();
          messages.push(data);
          let ids = Object.assign({}, s.ids);
          ids[data.id] = true;
          let update = filterMessages(messages, s.limit, ids);

          if (!s.unique) {
            return update;
          }

          let seen = Object.assign({}, s.seen);
          seen[data.user.name] = true;
          update.seen = seen;
          return update;
        }, () => {
          this.scrollToChat();
          this.bumpInactivity();
        });

        break;
      case "delete-by-user":
        this.setState(s => {
          let messages = s.messages.map(m => {
            if (m.user.name !== data.name) {
              return m;
            }

            m = Object.assign({}, m);
            m.deleted = true;
            return m;
          });

          return {messages};
        });

        break;
      case "delete-by-id":
          this.setState(s => {
            let messages = s.messages.map(m => {
              if (m.id !== data.id) {
                return m;
              }

              m = Object.assign({}, m);
              m.deleted = true;
              return m;
            });

            return {messages};
          });

        break;
      case "delete-all":
        this.setState(s => {
          let messages = s.messages.map(m => {
            m = Object.assign({}, m);
            m.deleted = true;
            return m;
          });

          return {messages};
        });

        break;
      case "enabled":
        this.setState({enabled: data.enabled}, this.bumpInactivity.bind(this));
        break;
      default:
        break;
    }
  }

  /**
   * Create a new element.
   */
  createEmote(rendered, item) {
    let emote = rendered.emotes[item.emote];

    if (!emote) {
      return <span className="text failed-emote">{item.emote}</span>;
    }

    let emoteUrl = this.pickEmoteUrl(emote);

    let props = {src: emoteUrl.url};

    props.height = calculateHeight(emote);

    if (emoteUrl.size !== null) {
      props.width = calculateWidth(props.height, emoteUrl.size);
    }

    return <img {...props} />;

    /**
     * Calculate the height to use.
     */
    function calculateHeight(emote) {
      let small = emote.urls.small;

      if (small === null || small.size === null) {
        return 32;
      }

      return Math.min(32, small.size.height);
    }

    function calculateWidth(height, size) {
      return Math.round(size.width * (height / size.height));
    }
  }

  /**
   * Create a new cached emote.
   */
  cachedEmote(key, rendered, item) {
    let img = this.cachedEmotes[item.emote];

    if (!img) {
      img = this.createEmote(rendered, item);
      this.cachedEmotes[item.emote] = img;
    }

    return React.cloneElement(img, {key});
  }

  renderText(m) {
    let rendered = m.rendered;

    if (rendered === null) {
      return <span className="text">{m.text}</span>;
    }

    return rendered.items.map((item, i) => {
      switch (item.type) {
        case "text":
          return <span className="text" key={i}>{item.text}</span>;
        case "emote":
          return this.cachedEmote(i, rendered, item);
        default:
          return <em key={i}>?</em>;
      }
    });
  }

  pickEmoteUrl(emote) {
    let alts = [emote.urls.large, emote.urls.medium, emote.urls.small];

    if (!this.state.highResEmotes) {
      alts = [emote.urls.small, emote.urls.medium, emote.urls.large]
    }

    for (var alt of alts) {
      if (alt !== null) {
        return alt;
      }
    }

    return emote.urls.small;
  }

  renderMessages(messages) {
    return messages.map(m => {
      let messageClasses = "";

      if (m.deleted) {
        messageClasses = "chat-message-deleted";
      }

      let t = new Date(m.timestamp);
      let timestamp = `[${utils.zeroPad(t.getHours(), 2)}:${utils.zeroPad(t.getMinutes(), 2)}]`;

      let nameStyle = {
        color: m.user.color,
      };

      let name = m.user.display_name;

      if (!isASCII(name)) {
        name = `${name} (${m.user.name})`;
      }

      let text = this.renderText(m);

      return (
        <div className={`chat-message ${messageClasses}`} key={m.id}>
          <span className="overlay-hidden chat-timestamp">{timestamp}</span>
          <span className="chat-name" style={nameStyle}>{name}:</span>
          <span className="chat-text">{text}</span>
        </div>
      );
    });
  }

  updateSearch() {
    if (!this.props.location) {
      return;
    }

    let path = `${this.props.location.pathname}`;
    let search = new URLSearchParams(this.props.location.search);
    let set = false;

    if (this.state.limit !== null) {
      search.set("limit", this.state.limit.toString());
      set = true;
    } else {
      search.delete("limit");
    }

    if (!!this.state.unique) {
      search.set("unique", this.state.unique.toString());
      set = true;
    } else {
      search.delete("unique");
    }

    if (!!this.state.showDeleted) {
      search.set("show-deleted", this.state.showDeleted.toString());
      set = true;
    } else {
      search.delete("show-deleted");
    }

    if (!!this.state.highResEmotes) {
      search.set("high-res-emotes", this.state.highResEmotes.toString());
      set = true;
    } else {
      search.delete("high-res-emotes");
    }

    if (this.state.inactivity !== null) {
      search.set("inactivity", this.state.inactivity.toString());
      set = true;
    } else {
      search.delete("inactivity");
    }

    if (set) {
      path = `${path}?${search}`;
    }

    this.props.history.replace(path);
  }

  limitChanged(e) {
    let limitText = e.target.value;
    let limit = parseInt(limitText);

    if (!isFinite(limit)) {
      limit = null;
    }

    this.setState({limit, limitText, changed: true}, () => {
      this.updateSearch();
    });
  }

  inactivityChanged(e) {
    let inactivityText = e.target.value;
    let inactivity = parseInt(inactivityText);

    if (!isFinite(inactivity)) {
      inactivity = null;
    }

    this.setState({inactivity, inactivityText, changed: true}, () => {
      this.updateSearch();
    });
  }

  uniqueChanged(e) {
    this.setState({unique: e.target.checked, changed: true}, () => {
      this.updateSearch();
    });
  }

  showDeletedChanged(e) {
    this.setState({showDeleted: e.target.checked, changed: true}, () => {
      this.updateSearch();
    });
  }

  highResEmotesChanged(e) {
    this.cachedEmotes = {};

    this.setState({highResEmotes: e.target.checked, changed: true}, () => {
      this.updateSearch();
    });
  }

  toggleEdit() {
    let changed = this.state.changed;

    this.setState({edit: !this.state.edit, changed: false}, () => {
      if (changed) {
        this.reloadChatMessages();
        this.bumpInactivity();
      }
    });
  }

  render() {
    var ws = <Websocket url={websocketUrl("ws/messages")} onMessage={this.handleData.bind(this)} />;

    let form = (
      <Modal className="chat-settings" show={this.state.edit} onHide={this.toggleEdit.bind(this)}>
        <Modal.Header closeButton>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group as={Col}>
              <Form.Label>Limit on number of messages:</Form.Label>
              <Form.Control type="number" value={this.state.limitText} onChange={this.limitChanged.bind(this)} />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Label>Inactivity timeout (seconds):</Form.Label>
              <Form.Control type="number" value={this.state.inactivityText} onChange={this.inactivityChanged.bind(this)} />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Check id="unique" label="Only show first message from each user" type="checkbox" checked={this.state.unique} onChange={this.uniqueChanged.bind(this)} />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Check id="show-deleted" label="Show deleted messages" type="checkbox" checked={this.state.showDeleted} onChange={this.showDeletedChanged.bind(this)} />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Check id="high-res-emotes" label="Use high resolution emotes" type="checkbox" checked={this.state.highResEmotes} onChange={this.highResEmotesChanged.bind(this)} />
            </Form.Group>
            <div>
              <Col>
                <p>
                  If you want to embed this into OBS, please add the following Custom CSS:
                </p>

                <pre className="chat-obs"><code>
                  {OBS_CSS.join("\n")}
                </code></pre>
              </Col>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    );

    let messagesClasses = "";
    let messagesStyle = {};

    if (!this.state.visible) {
      messagesClasses = "hidden";
      messagesStyle.opacity = "0";
    }

    let messages = this.state.messages;

    if (!this.state.showDeleted) {
      messages = messages.filter(m => !m.deleted);
    }

    if (messages.length === 0) {
      messages = <div className="overlay-hidden chat-no-messages">No Messages</div>;
    } else {
      messages = <div style={messagesStyle} className={`chat-messages ${messagesClasses}`}>{this.renderMessages(messages)}</div>;
    }

    let edit = null;

    if (!this.state.edit) {
      edit = (
        <div className="overlay-hidden edit-button">
          <a onClick={this.toggleEdit.bind(this)}>
            <FontAwesomeIcon icon="cog" />
          </a>
        </div>
      );
    }

    let enabled = null;

    if (!this.state.enabled) {
      enabled = (
        <Alert className="chat-warning" variant="warning">
          Chat not enabled in <Link to="/modules/chat-log">settings</Link>:<br />
          <code>chat-log/enabled = false</code>
        </Alert>
      );
    }

    return (
      <div id="chat">
        {ws}
        {messages}
        {enabled}
        <div style={{clear: "both"}} ref={this.bottomRef}></div>
        {form}
        {edit}
      </div>
    );
  }
}