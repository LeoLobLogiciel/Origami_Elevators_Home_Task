import './styles/main.scss';
import { Building } from './Building.js';
import { ControlPanel } from './ControlPanel.js';

const root = document.querySelector('.building');
const building = new Building(root);

const panelRoot = document.querySelector('.app__sidebar');
if (panelRoot) {
  new ControlPanel(panelRoot, building);
}
