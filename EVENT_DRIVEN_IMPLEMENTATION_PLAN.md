# Event-Driven PortableContent Implementation Plan

This document outlines the implementation plan for enabling event-driven dynamic property updates for PortableContent components, allowing external systems (GUI controls, AI agents, APIs) to target specific components by ID.

## Project Context
- **Greenfield project** - No backward compatibility required
- **Component naming changes**:
  - ResponsiveContainer → **PortableContent**
  - ResponsiveMarkup → **MarkupElement**
  - ResponsiveImage → **ImageElement**
  - ResponsiveSvg → **SvgElement**

## Architecture Overview

### Core Components
1. **PortableContentEventManager** - Central event dispatcher and component registry
2. **Enhanced PortableContent Components** - Components that can register for events
3. **Event Integration Layer** - Bridges for GUI controls, AI agents, and external systems
4. **Type-Safe Event System** - TypeScript interfaces for all event types
5. **Event Queue System** - High-frequency update management using existing tools

## Implementation Plan

### Phase 1: Core Event System

#### 1.1 Create Framework-Independent PortableContentEventManager
```typescript
// src/managers/PortableContentEventManager.ts
export class PortableContentEventManager {
  private components: Map<string, ComponentUpdateFunction>;
  private eventHistory: EventHistoryEntry[];
  private subscribers: Map<string, EventSubscriber[]>;
  private eventQueue: EventQueue; // High-frequency update management

  constructor(options?: EventManagerOptions) {
    this.components = new Map();
    this.eventHistory = [];
    this.subscribers = new Map();
    this.eventQueue = new EventQueue(options?.queueOptions || DEFAULT_QUEUE_OPTIONS);
  }

  // Component registration (framework agnostic)
  registerComponent(id: string, updateFn: ComponentUpdateFunction): void {
    this.components.set(id, updateFn);
  }

  unregisterComponent(id: string): void {
    this.components.delete(id);
  }

  // Event handling with queuing
  async sendEvent(componentId: string, eventType: string, data: any): Promise<boolean> {
    const event: ComponentEvent = {
      componentId,
      eventType,
      data,
      timestamp: Date.now()
    };

    const updateFn = this.components.get(componentId);
    if (!updateFn) {
      return false;
    }

    try {
      await updateFn(eventType, data);
      this.addToHistory(event);
      this.notifySubscribers(event);
      return true;
    } catch (error) {
      console.error(`Event failed for component ${componentId}:`, error);
      return false;
    }
  }

  async sendBatchEvents(events: ComponentEvent[]): Promise<BatchResult> {
    const results: BatchResult = { successful: [], failed: [], queued: [] };

    for (const event of events) {
      const success = await this.sendEvent(event.componentId, event.eventType, event.data);
      if (success) {
        results.successful.push(event.componentId);
      } else {
        results.failed.push({ componentId: event.componentId, error: 'Update function failed' });
      }
    }

    return results;
  }

  queueEvent(componentId: string, eventType: string, data: any): void {
    const event: ComponentEvent = {
      componentId,
      eventType,
      data,
      timestamp: Date.now()
    };

    this.eventQueue.enqueue(event);
  }

  async flushEventQueue(): Promise<void> {
    // EventQueue handles batching and deduplication
    return this.eventQueue.flush();
  }

  // Event subscription (for debugging/logging)
  subscribe(eventType: string, callback: EventSubscriber): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);
  }

  unsubscribe(eventType: string, callback: EventSubscriber): void {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Utility methods
  getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }

  getEventHistory(componentId?: string): EventHistoryEntry[] {
    if (componentId) {
      return this.eventHistory.filter(entry => entry.componentId === componentId);
    }
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Private helper methods
  private addToHistory(event: ComponentEvent): void {
    this.eventHistory.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    // Keep history size manageable
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }
  }

  private notifySubscribers(event: ComponentEvent): void {
    const callbacks = this.subscribers.get(event.eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Subscriber callback failed:', error);
        }
      });
    }
  }

  // Future: Event persistence/replay (architecture ready)
  // saveEventHistory(storage: EventStorage): Promise<void>;
  // loadEventHistory(storage: EventStorage): Promise<void>;
  // replayEvents(fromTimestamp?: number): Promise<void>;
}
```

#### 1.2 Define Framework-Independent Event Types
```typescript
// src/types/events.ts
export interface ComponentEvent {
  componentId: string;
  eventType: 'updateProps' | 'updateStyle' | 'updateContent';
  data: any;
  timestamp?: number;
  source?: 'gui' | 'ai' | 'api' | 'user' | 'custom-protocol';
  priority?: 'low' | 'normal' | 'high' | 'immediate';
}

// Framework-agnostic update function
export interface ComponentUpdateFunction {
  (eventType: string, data: any): Promise<void>;
}

export interface BatchResult {
  successful: string[];
  failed: { componentId: string; error: string }[];
  queued: string[];
}

export interface EventHistoryEntry extends ComponentEvent {
  timestamp: number;
}

export interface EventSubscriber {
  (event: ComponentEvent): void;
}

export interface EventQueueOptions {
  maxQueueSize: number;
  flushInterval: number; // ms
  priorityLevels: string[];
}

export interface EventManagerOptions {
  queueOptions?: EventQueueOptions;
  maxHistorySize?: number;
}

export const DEFAULT_QUEUE_OPTIONS: EventQueueOptions = {
  maxQueueSize: 1000,
  flushInterval: 16, // ~60fps
  priorityLevels: ['low', 'normal', 'high', 'immediate']
};
```

#### 1.3 Create React Integration Layer
```typescript
// src/integrations/react/PortableContentEventContext.tsx
import React, { createContext, useMemo, useCallback } from 'react';
import { PortableContentEventManager } from '../../managers/PortableContentEventManager';

export const PortableContentEventContext = createContext<{
  eventManager: PortableContentEventManager;
  sendEvent: (componentId: string, eventType: string, data: any) => Promise<boolean>;
  sendBatchEvents: (events: ComponentEvent[]) => Promise<BatchResult>;
  queueEvent: (componentId: string, eventType: string, data: any) => void;
} | null>(null);

export const PortableContentEventProvider = ({
  children,
  options
}: {
  children: React.ReactNode;
  options?: EventManagerOptions;
}) => {
  const eventManager = useMemo(() => new PortableContentEventManager(options), [options]);

  const sendEvent = useCallback(async (componentId, eventType, data) => {
    return await eventManager.sendEvent(componentId, eventType, data);
  }, [eventManager]);

  const sendBatchEvents = useCallback(async (events) => {
    return await eventManager.sendBatchEvents(events);
  }, [eventManager]);

  const queueEvent = useCallback((componentId, eventType, data) => {
    eventManager.queueEvent(componentId, eventType, data);
  }, [eventManager]);

  return (
    <PortableContentEventContext.Provider value={{
      eventManager,
      sendEvent,
      sendBatchEvents,
      queueEvent
    }}>
      {children}
    </PortableContentEventContext.Provider>
  );
};
```

### Phase 2: Framework Integration Layers

#### 2.1 React Integration Hook
```typescript
// src/integrations/react/usePortableContentEvents.ts
import { useState, useEffect, useContext } from 'react';
import { PortableContentEventContext } from './PortableContentEventContext';

export const usePortableContentEvents = (componentId?: string) => {
  const context = useContext(PortableContentEventContext);
  const [dynamicProps, setDynamicProps] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!componentId || !context) return;

    const updateFunction = async (eventType: string, data: any) => {
      setIsUpdating(true);
      try {
        switch (eventType) {
          case 'updateProps':
            setDynamicProps(prev => ({ ...prev, ...data }));
            break;
          case 'updateStyle':
            setDynamicProps(prev => ({
              ...prev,
              style: { ...prev.style, ...data }
            }));
            break;
          case 'updateContent':
            setDynamicProps(prev => ({ ...prev, content: data }));
            break;
        }
      } finally {
        setIsUpdating(false);
      }
    };

    context.eventManager.registerComponent(componentId, updateFunction);

    return () => {
      context.eventManager.unregisterComponent(componentId);
    };
  }, [componentId, context]);

  return {
    dynamicProps,
    isUpdating,
    sendEvent: context?.sendEvent,
    queueEvent: context?.queueEvent
  };
};
```

#### 2.2 Vue Integration (Example)
```typescript
// src/integrations/vue/usePortableContentEvents.ts
import { ref, onMounted, onUnmounted, inject } from 'vue';

export function usePortableContentEvents(componentId?: string) {
  const eventManager = inject('eventManager') as PortableContentEventManager;
  const dynamicProps = ref({});
  const isUpdating = ref(false);

  const updateFunction = async (eventType: string, data: any) => {
    isUpdating.value = true;
    try {
      switch (eventType) {
        case 'updateProps':
          dynamicProps.value = { ...dynamicProps.value, ...data };
          break;
        case 'updateStyle':
          dynamicProps.value = {
            ...dynamicProps.value,
            style: { ...dynamicProps.value.style, ...data }
          };
          break;
        case 'updateContent':
          dynamicProps.value = { ...dynamicProps.value, content: data };
          break;
      }
    } finally {
      isUpdating.value = false;
    }
  };

  onMounted(() => {
    if (componentId && eventManager) {
      eventManager.registerComponent(componentId, updateFunction);
    }
  });

  onUnmounted(() => {
    if (componentId && eventManager) {
      eventManager.unregisterComponent(componentId);
    }
  });

  return {
    dynamicProps,
    isUpdating,
    sendEvent: eventManager?.sendEvent.bind(eventManager),
    queueEvent: eventManager?.queueEvent.bind(eventManager)
  };
}
```

#### 2.3 Vanilla JS Integration (Example)
```typescript
// src/integrations/vanilla/PortableContentEventIntegration.ts
export class VanillaPortableContentIntegration {
  private eventManager: PortableContentEventManager;
  private elements: Map<string, HTMLElement> = new Map();

  constructor(eventManager: PortableContentEventManager) {
    this.eventManager = eventManager;
  }

  registerElement(id: string, element: HTMLElement): void {
    this.elements.set(id, element);

    const updateFunction = async (eventType: string, data: any) => {
      const el = this.elements.get(id);
      if (!el) return;

      switch (eventType) {
        case 'updateProps':
          Object.assign(el.dataset, data);
          break;
        case 'updateStyle':
          Object.assign(el.style, data);
          break;
        case 'updateContent':
          el.innerHTML = data;
          break;
      }
    };

    this.eventManager.registerComponent(id, updateFunction);
  }

  unregisterElement(id: string): void {
    this.elements.delete(id);
    this.eventManager.unregisterComponent(id);
  }
}
```

#### 2.4 React Component Integration Example
```typescript
// src/integrations/react/components/MarkupElement.tsx
import { usePortableContentEvents } from '../usePortableContentEvents';

export interface MarkupElementProps {
  // ... existing props
  eventId?: string; // Event targeting ID
}

export const MarkupElement = ({
  // ... existing props
  eventId,
  ...props
}: MarkupElementProps) => {
  const { dynamicProps, isUpdating } = usePortableContentEvents(eventId);

  // Merge dynamic props with static props (dynamic takes precedence)
  const finalProps = {
    ...props,
    ...dynamicProps,
    // Handle style merging specially
    style: { ...props.style, ...dynamicProps.style }
  };

  // Add loading state for updates
  if (isUpdating && eventId) {
    finalProps.style = {
      ...finalProps.style,
      opacity: 0.7, // Visual feedback during updates
    };
  }

  // ... rest of existing component logic using finalProps
};
```

#### 2.5 Framework Integration Summary
The same pattern applies to all components across frameworks:
- **React**: Use hooks and context
- **Vue**: Use composition API and provide/inject
- **Angular**: Use services and dependency injection
- **Vanilla JS**: Use direct DOM manipulation
- **Svelte**: Use stores and reactive statements

Components to integrate:
- **PortableContent** (formerly ResponsiveContainer)
- **ImageElement** (formerly ResponsiveImage)
- **SvgElement** (formerly ResponsiveSvg)

#### 2.4 Add Event Queue System
```typescript
// src/utils/EventQueue.ts - Using existing tools like RxJS or custom implementation
import { Subject, throttleTime, bufferTime } from 'rxjs';

export class EventQueue {
  private eventStream = new Subject<ComponentEvent>();
  private processedEvents = new Subject<ComponentEvent[]>();

  constructor(options: EventQueueOptions) {
    // High-frequency event throttling
    this.eventStream
      .pipe(
        bufferTime(options.flushInterval),
        throttleTime(16) // ~60fps for smooth updates
      )
      .subscribe(events => {
        if (events.length > 0) {
          this.processedEvents.next(this.deduplicateEvents(events));
        }
      });
  }

  enqueue(event: ComponentEvent): void {
    this.eventStream.next(event);
  }

  subscribe(callback: (events: ComponentEvent[]) => void): void {
    this.processedEvents.subscribe(callback);
  }

  private deduplicateEvents(events: ComponentEvent[]): ComponentEvent[] {
    // Keep only the latest event per component+eventType combination
    const eventMap = new Map<string, ComponentEvent>();

    events.forEach(event => {
      const key = `${event.componentId}:${event.eventType}`;
      eventMap.set(key, event);
    });

    return Array.from(eventMap.values());
  }
}
```



### Phase 3: External System Integration

#### 3.1 GUI Integration Layer
```typescript
// src/integrations/GUIIntegration.ts
export class GUIIntegration {
  constructor(private eventManager: PortableContentEventManager) {}

  // Color wheel integration with queuing for high-frequency updates
  connectColorWheel(colorWheel: ColorWheelComponent, targetComponentId: string) {
    colorWheel.onColorChange = (color: string) => {
      // Use queueEvent for high-frequency color changes
      this.eventManager.queueEvent(targetComponentId, 'updateProps', {
        backgroundColor: color
      });
    };
  }

  // Slider integration with queuing
  connectSlider(slider: SliderComponent, targetComponentId: string, propName: string) {
    slider.onValueChange = (value: number) => {
      // Use queueEvent for smooth slider updates
      this.eventManager.queueEvent(targetComponentId, 'updateProps', {
        [propName]: value
      });
    };
  }

  // Multi-component control panel
  createControlPanel(componentIds: string[]) {
    return {
      updateAll: (props: any) => {
        const events = componentIds.map(id => ({
          componentId: id,
          eventType: 'updateProps',
          data: props
        }));
        this.eventManager.sendBatchEvents(events);
      },
      updateSpecific: (componentId: string, props: any) => {
        this.eventManager.sendEvent(componentId, 'updateProps', props);
      }
    };
  }
}
```

#### 3.2 AI Agent Integration with Custom Protocol Support
```typescript
// src/integrations/AIAgentIntegration.ts
export class AIAgentIntegration {
  constructor(private eventManager: PortableContentEventManager) {}

  // Parse AI messages and convert to events (supports custom protocol)
  async handleAIMessage(message: string): Promise<boolean> {
    try {
      const parsed = this.parseAIMessage(message);
      return await this.eventManager.sendEvent(
        parsed.componentId,
        parsed.eventType,
        parsed.data
      );
    } catch (error) {
      console.error('Failed to parse AI message:', error);
      return false;
    }
  }

  // Handle custom communication protocol
  async handleCustomProtocolMessage(protocolMessage: any): Promise<boolean> {
    try {
      // This will be implemented based on your custom protocol specification
      const event = this.parseCustomProtocol(protocolMessage);
      return await this.eventManager.sendEvent(
        event.componentId,
        event.eventType,
        event.data
      );
    } catch (error) {
      console.error('Failed to parse custom protocol message:', error);
      return false;
    }
  }

  // Custom protocol parser (placeholder for your protocol)
  private parseCustomProtocol(protocolMessage: any): ComponentEvent {
    // This will be implemented based on your custom communication protocol
    // Placeholder implementation:
    return {
      componentId: protocolMessage.targetId,
      eventType: protocolMessage.action,
      data: protocolMessage.payload,
      source: 'custom-protocol'
    };
  }

  // AI message parsing logic (fallback for simple text commands)
  private parseAIMessage(message: string) {
    // Examples of AI message formats:
    // "change markup1 background to blue"
    // "set markup2 padding to 20"
    // "update markup3 content to 'Hello World'"
    
    const patterns = {
      backgroundColor: /change (\w+) background to (\w+)/i,
      padding: /set (\w+) padding to (\d+)/i,
      content: /update (\w+) content to ['"](.+)['"]/i,
    };

    for (const [prop, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        return {
          componentId: match[1],
          eventType: 'updateProps',
          data: { [prop]: match[2] }
        };
      }
    }

    throw new Error('Unable to parse AI message');
  }

  // Batch AI operations
  handleBatchAIMessage(messages: string[]): BatchResult {
    const events = messages
      .map(msg => {
        try {
          const parsed = this.parseAIMessage(msg);
          return {
            componentId: parsed.componentId,
            eventType: parsed.eventType,
            data: parsed.data
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return this.eventManager.sendBatchEvents(events);
  }
}
```

#### 3.3 API/WebSocket Integration
```typescript
// src/integrations/APIIntegration.ts
export class APIIntegration {
  constructor(private eventManager: PortableContentEventManager) {}

  // WebSocket message handling
  async handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'component-update') {
        return await this.eventManager.sendEvent(
          data.componentId,
          data.eventType,
          data.payload
        );
      }
    } catch (error) {
      console.error('WebSocket message parsing failed:', error);
    }
  }

  // REST API endpoint simulation
  async handleAPIUpdate(componentId: string, updates: any) {
    return await this.eventManager.sendEvent(componentId, 'updateProps', updates);
  }

  // Bulk API updates
  async handleBulkAPIUpdate(updates: ComponentEvent[]) {
    return await this.eventManager.sendBatchEvents(updates);
  }
}
```

### Phase 4: Usage Examples

#### 4.1 Basic Usage
```typescript
function MyApp() {
  return (
    <ScreenProvider>
      <PortableContentEventProvider>
        <PortableContent>
          <MarkupElement
            eventId="markup1"
            content="I can be controlled by events!"
            backgroundColor="#ffffff"
          />
          <MarkupElement
            eventId="markup2"
            content="Me too!"
            backgroundColor="#f0f0f0"
          />
          <MarkupElement
            content="I'm static - no eventId"
          />
        </PortableContent>

        <ControlPanel />
      </PortableContentEventProvider>
    </ScreenProvider>
  );
}
```

#### 4.2 Control Panel Example
```typescript
function ControlPanel() {
  const { sendEvent, queueEvent } = useContext(PortableContentEventContext);

  return (
    <View>
      <ColorWheel
        onColorChange={(color) =>
          queueEvent('markup1', 'updateProps', { backgroundColor: color })
        }
      />
      <Button
        title="Make Markup2 Blue"
        onPress={async () =>
          await sendEvent('markup2', 'updateProps', { backgroundColor: '#0000ff' })
        }
      />
    </View>
  );
}
```

#### 4.3 AI Integration Example
```typescript
function AIControlledInterface() {
  const aiIntegration = useRef(new AIAgentIntegration(eventManager));

  useEffect(() => {
    // Handle custom protocol messages
    const customProtocolMessages = [
      { targetId: 'markup1', action: 'updateProps', payload: { backgroundColor: 'blue' } },
      { targetId: 'markup2', action: 'updateProps', payload: { padding: 24 } },
      { targetId: 'markup3', action: 'updateContent', payload: 'AI says hello!' }
    ];

    customProtocolMessages.forEach(async msg => {
      await aiIntegration.current.handleCustomProtocolMessage(msg);
    });

    // Fallback: Simple text commands
    const textCommands = [
      "change markup1 background to blue",
      "set markup2 padding to 24",
      "update markup3 content to 'AI says hello!'"
    ];

    textCommands.forEach(async msg => {
      await aiIntegration.current.handleAIMessage(msg);
    });
  }, []);

  return (
    <PortableContent>
      <MarkupElement eventId="markup1" content="AI controlled" />
      <MarkupElement eventId="markup2" content="AI controlled" />
      <MarkupElement eventId="markup3" content="AI controlled" />
    </PortableContent>
  );
}
```

## Implementation Timeline

### Week 1: Core Framework-Independent System
- [ ] PortableContentEventManager class (framework independent)
- [ ] Event type definitions (framework independent)
- [ ] EventQueue system (using RxJS or similar)
- [ ] Framework integration architecture

### Week 2: Framework Integrations
- [ ] React integration layer (Context, Provider, hooks)
- [ ] Vue integration example (composition API)
- [ ] Vanilla JS integration example
- [ ] Component integration patterns for each framework

### Week 2.5: React Component Enhancement
- [ ] Enhance MarkupElement (ResponsiveMarkup) with React event support
- [ ] Enhance PortableContent (ResponsiveContainer) with React event support
- [ ] Enhance ImageElement (ResponsiveImage) with React event support
- [ ] Enhance SvgElement (ResponsiveSvg) with React event support
- [ ] Add visual feedback for updating states

### Week 3: Integration Layers
- [ ] GUIIntegration class with queuing support
- [ ] AIAgentIntegration class with custom protocol support
- [ ] APIIntegration class
- [ ] Custom protocol parser framework
- [ ] Example implementations

### Week 4: Testing & Documentation
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] Performance testing with high-frequency updates
- [ ] Documentation and examples
- [ ] Custom protocol documentation template

## Benefits of This Framework-Independent Approach

1. **Framework Agnostic**: Core event manager works with React, Vue, Angular, Vanilla JS, etc.
2. **Targeted Updates**: Each component can be updated independently by ID
3. **Multiple Event Sources**: GUI, AI, API, WebSocket, custom protocol all supported
4. **Type Safety**: Full TypeScript support for all event types
5. **Performance**: Only targeted components re-render + event queuing for high-frequency updates
6. **Debugging**: Event history and logging built-in
7. **Scalable**: Easy to add new event types and sources
8. **Flexible**: Supports both individual and batch updates
9. **High-Frequency Support**: Event queuing with RxJS for smooth updates
10. **Future-Ready**: Architecture supports event persistence/replay
11. **Custom Protocol Ready**: Framework for your custom communication protocol
12. **Portable**: Can be used in any JavaScript environment
13. **Testable**: Core logic is pure TypeScript, easy to unit test

## Implementation Decisions Based on Your Requirements

✅ **Framework Independent** - Core event manager works with any JavaScript framework
✅ **No backward compatibility** - Clean, modern API without legacy support
✅ **Event validation removed** - Will be handled in a different layer
✅ **Event queuing implemented** - Using RxJS for high-frequency update management
✅ **Event persistence architecture** - Ready for future implementation
✅ **Custom protocol support** - Framework ready for your communication protocol
✅ **Component renaming**:
- ResponsiveContainer → **PortableContent**
- ResponsiveMarkup → **MarkupElement**
- ResponsiveImage → **ImageElement**
- ResponsiveSvg → **SvgElement**

## Custom Protocol Integration Points

The system is designed to easily integrate your custom communication protocol:

1. **parseCustomProtocol()** method in AIAgentIntegration
2. **handleCustomProtocolMessage()** for protocol-specific handling
3. **Custom event source** tracking ('custom-protocol')
4. **Extensible event types** for protocol-specific actions
5. **Validation rules** can be protocol-aware

## Ready for Implementation

The plan addresses all your requirements:
- ✅ **Framework Independent** - Works with React, Vue, Angular, Vanilla JS, etc.
- ✅ Greenfield approach (no backward compatibility)
- ✅ Event validation removed (handled in different layer)
- ✅ High-frequency event queuing (RxJS-based)
- ✅ Architecture ready for event persistence/replay
- ✅ Custom communication protocol support
- ✅ Updated component naming

## Framework Usage Examples

### React
```typescript
import { PortableContentEventProvider } from './integrations/react';
import { MarkupElement } from './integrations/react/components';

<PortableContentEventProvider>
  <MarkupElement eventId="markup1" content="Hello" />
</PortableContentEventProvider>
```

### Vue
```typescript
import { PortableContentEventManager } from './managers/PortableContentEventManager';

app.provide('eventManager', new PortableContentEventManager());
```

### Vanilla JS
```typescript
import { PortableContentEventManager } from './managers/PortableContentEventManager';
import { VanillaPortableContentIntegration } from './integrations/vanilla';

const eventManager = new PortableContentEventManager();
const integration = new VanillaPortableContentIntegration(eventManager);
integration.registerElement('markup1', document.getElementById('markup1'));
```

**The core `PortableContentEventManager` is now completely framework independent!** 🎉

Please review and approve to begin implementation!
