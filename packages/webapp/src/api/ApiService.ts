
import { v4 as uuidv4 } from 'uuid';
import { Event, EventAction, EventListener } from '@home-gallery/events'
import { pushEvent as pushEventApi, eventStream as eventStreamApi, ServerEventListener } from './api';
import { ActionEventListener } from './ActionEventListner';
import { UnsavedEventHandler } from './UnsavedEventHanlder';
import { Tag } from './models';
export { fetchAll, getEvents, mapEntriesForBrowser } from './api'

const tagToAction = (tag: Tag): EventAction => {
  if (tag.remove) {
    return {action: 'removeTag', value: tag.name}
  } else {
    return {action: 'addTag', value: tag.name}
  }
}

export const addTags = async (entryIds: string[], tags: Tag[]) => {
  const actions = tags.map(tagToAction);
  const event: Event = {id: uuidv4(), type: 'userAction', targetIds: entryIds, actions };
  return pushEvent(event);
}

let eventStreamSubscribed = false;

const unsavedEventHandler = new UnsavedEventHandler();
const actionEventListener = new ActionEventListener();

export const pushEvent = async (event: Event) => {
  actionEventListener.publish(event);
  unsavedEventHandler.addEvent(event);
  return pushEventApi(event)
    .catch(e => {
      console.log(`Event ${event.id} could not be sent: ${e}. Event will be lost on the next session`);
      throw e;
    });
}

export const eventStream = (onActionEvent: EventListener, onServerEvent: ServerEventListener) => {
  if (!eventStreamSubscribed) {
    eventStreamSubscribed = true;
    eventStreamApi(unsavedEventHandler.middleware(actionEventListener.publish), onServerEvent);
  }
  return actionEventListener.subscribe(onActionEvent);
}